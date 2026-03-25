use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use anyhow::Context;

use super::types::{EnvironmentFile, EnvironmentSummary, EnvironmentVariable};
use crate::collections::slugify;

// ── Helpers ──────────────────────────────────────────────────────────────────

fn read_manifest<T: serde::de::DeserializeOwned>(path: &Path) -> anyhow::Result<T> {
    let content = fs::read_to_string(path)
        .with_context(|| format!("Failed to read manifest: {}", path.display()))?;
    serde_json::from_str(&content)
        .with_context(|| format!("Failed to parse manifest: {}", path.display()))
}

fn write_manifest<T: serde::Serialize>(path: &Path, data: &T) -> anyhow::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let content = serde_json::to_string_pretty(data)?;
    fs::write(path, content).with_context(|| format!("Failed to write manifest: {}", path.display()))
}

fn environments_dir(ws_dir: &Path) -> PathBuf {
    ws_dir.join("environments")
}

fn secrets_dir(app_data: &Path, workspace_id: &str) -> PathBuf {
    app_data.join("secrets").join(workspace_id)
}

// ── Public API ────────────────────────────────────────────────────────────────

/// List all environments in a workspace, returning summaries with slug and name.
pub fn list_environments(ws_dir: &Path) -> anyhow::Result<Vec<EnvironmentSummary>> {
    let env_dir = environments_dir(ws_dir);
    if !env_dir.exists() {
        return Ok(vec![]);
    }

    let mut summaries: Vec<EnvironmentSummary> = vec![];

    let mut entries: Vec<_> = fs::read_dir(&env_dir)?
        .filter_map(|e| e.ok())
        .filter(|e| {
            let path = e.path();
            path.is_file() && path.extension().map(|ext| ext == "json").unwrap_or(false)
        })
        .collect();
    // Sort by filename for stable ordering
    entries.sort_by_key(|e| e.file_name());

    for entry in entries {
        let path = entry.path();
        let slug = path
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();
        if slug.is_empty() {
            continue;
        }
        match read_manifest::<EnvironmentFile>(&path) {
            Ok(env) => summaries.push(EnvironmentSummary {
                slug,
                name: env.name,
            }),
            Err(_) => continue, // silently skip malformed files
        }
    }

    Ok(summaries)
}

/// Load a full environment file by slug.
pub fn load_environment(ws_dir: &Path, env_slug: &str) -> anyhow::Result<EnvironmentFile> {
    let path = environments_dir(ws_dir).join(format!("{}.json", env_slug));
    read_manifest(&path)
}

/// Save an environment file, stripping secret values before writing (ENV-05 / D-10).
/// Variables where `secret == true` have their `value` set to empty string on disk.
pub fn save_environment(
    ws_dir: &Path,
    env_slug: &str,
    env: &EnvironmentFile,
) -> anyhow::Result<()> {
    let env_dir = environments_dir(ws_dir);
    let path = env_dir.join(format!("{}.json", env_slug));

    // Sanitize: strip secret values before writing to disk
    let sanitized = EnvironmentFile {
        name: env.name.clone(),
        variables: env
            .variables
            .iter()
            .map(|v| EnvironmentVariable {
                key: v.key.clone(),
                value: if v.secret {
                    String::new()
                } else {
                    v.value.clone()
                },
                secret: v.secret,
            })
            .collect(),
    };

    write_manifest(&path, &sanitized)
}

/// Create a new environment file with the given name.
/// Returns an `EnvironmentSummary` with the generated slug and name.
pub fn create_environment(ws_dir: &Path, name: &str) -> anyhow::Result<EnvironmentSummary> {
    let env_dir = environments_dir(ws_dir);
    fs::create_dir_all(&env_dir)?;

    let base_slug = slugify::to_slug(name);
    let slug = slugify::resolve_collision(&env_dir, &base_slug, "json")?;

    let env = EnvironmentFile {
        name: name.to_string(),
        variables: vec![],
    };
    write_manifest(&env_dir.join(format!("{}.json", slug)), &env)?;

    Ok(EnvironmentSummary {
        slug,
        name: name.to_string(),
    })
}

/// Delete an environment file and its associated secrets file (D-04 atomic delete).
pub fn delete_environment(
    ws_dir: &Path,
    app_data: &Path,
    workspace_id: &str,
    env_slug: &str,
) -> anyhow::Result<()> {
    let env_path = environments_dir(ws_dir).join(format!("{}.json", env_slug));
    if env_path.exists() {
        fs::remove_file(&env_path)
            .with_context(|| format!("Failed to delete environment: {}", env_path.display()))?;
    }
    // Also delete secrets file (if it exists)
    delete_secrets(app_data, workspace_id, env_slug)
}

/// Rename an environment: reads old file, updates name, writes to new slug path, deletes old file.
/// Also renames secrets file if it exists.
pub fn rename_environment(
    ws_dir: &Path,
    app_data: &Path,
    workspace_id: &str,
    old_slug: &str,
    new_name: &str,
) -> anyhow::Result<EnvironmentSummary> {
    let env_dir = environments_dir(ws_dir);
    let old_path = env_dir.join(format!("{}.json", old_slug));

    let mut env: EnvironmentFile = read_manifest(&old_path)?;
    env.name = new_name.to_string();

    let base_slug = slugify::to_slug(new_name);
    let new_slug = slugify::resolve_collision(&env_dir, &base_slug, "json")?;
    let new_path = env_dir.join(format!("{}.json", new_slug));

    // Write to new path, then delete old (preserves data on error)
    write_manifest(&new_path, &env)?;
    fs::remove_file(&old_path)
        .with_context(|| format!("Failed to delete old environment file: {}", old_path.display()))?;

    // Rename secrets file if it exists
    let old_secrets = secrets_dir(app_data, workspace_id).join(format!("{}.json", old_slug));
    let new_secrets = secrets_dir(app_data, workspace_id).join(format!("{}.json", new_slug));
    if old_secrets.exists() {
        fs::rename(&old_secrets, &new_secrets)
            .with_context(|| format!("Failed to rename secrets file: {}", old_secrets.display()))?;
    }

    Ok(EnvironmentSummary {
        slug: new_slug,
        name: new_name.to_string(),
    })
}

/// Read secret values for an environment from the local secrets directory.
/// Returns an empty HashMap if the file doesn't exist.
pub fn read_secrets(
    app_data: &Path,
    workspace_id: &str,
    env_slug: &str,
) -> anyhow::Result<HashMap<String, String>> {
    let path = secrets_dir(app_data, workspace_id).join(format!("{}.json", env_slug));
    if !path.exists() {
        return Ok(HashMap::new());
    }
    read_manifest(&path)
}

/// Write secret values for an environment to the local secrets directory.
/// Creates the directory if needed.
pub fn write_secrets(
    app_data: &Path,
    workspace_id: &str,
    env_slug: &str,
    secrets: &HashMap<String, String>,
) -> anyhow::Result<()> {
    let dir = secrets_dir(app_data, workspace_id);
    fs::create_dir_all(&dir)?;
    let path = dir.join(format!("{}.json", env_slug));
    write_manifest(&path, secrets)
}

/// Delete the secrets file for an environment (called by delete_environment).
pub fn delete_secrets(
    app_data: &Path,
    workspace_id: &str,
    env_slug: &str,
) -> anyhow::Result<()> {
    let path = secrets_dir(app_data, workspace_id).join(format!("{}.json", env_slug));
    if path.exists() {
        fs::remove_file(&path)
            .with_context(|| format!("Failed to delete secrets file: {}", path.display()))?;
    }
    Ok(())
}

// ── Tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_create_environment_creates_file_with_correct_json() {
        let dir = tempdir().unwrap();
        let ws_dir = dir.path();

        let summary = create_environment(ws_dir, "Production").unwrap();
        assert_eq!(summary.slug, "production");
        assert_eq!(summary.name, "Production");

        let env_path = ws_dir.join("environments").join("production.json");
        assert!(env_path.exists());

        let env: EnvironmentFile = read_manifest(&env_path).unwrap();
        assert_eq!(env.name, "Production");
        assert!(env.variables.is_empty());
    }

    #[test]
    fn test_save_environment_strips_secret_values() {
        let dir = tempdir().unwrap();
        let ws_dir = dir.path();

        // Create first so the directory and file exist
        create_environment(ws_dir, "Dev").unwrap();

        let env = EnvironmentFile {
            name: "Dev".to_string(),
            variables: vec![
                EnvironmentVariable {
                    key: "API_URL".to_string(),
                    value: "https://api.example.com".to_string(),
                    secret: false,
                },
                EnvironmentVariable {
                    key: "API_KEY".to_string(),
                    value: "super-secret-key".to_string(),
                    secret: true,
                },
            ],
        };

        save_environment(ws_dir, "dev", &env).unwrap();

        let saved: EnvironmentFile = read_manifest(&ws_dir.join("environments").join("dev.json")).unwrap();
        assert_eq!(saved.variables.len(), 2);

        // Non-secret value preserved
        assert_eq!(saved.variables[0].key, "API_URL");
        assert_eq!(saved.variables[0].value, "https://api.example.com");
        assert!(!saved.variables[0].secret);

        // Secret value stripped to empty string
        assert_eq!(saved.variables[1].key, "API_KEY");
        assert_eq!(saved.variables[1].value, "");
        assert!(saved.variables[1].secret);
    }

    #[test]
    fn test_list_environments_returns_all_with_correct_slugs() {
        let dir = tempdir().unwrap();
        let ws_dir = dir.path();

        create_environment(ws_dir, "Development").unwrap();
        create_environment(ws_dir, "Staging").unwrap();
        create_environment(ws_dir, "Production").unwrap();

        let summaries = list_environments(ws_dir).unwrap();
        assert_eq!(summaries.len(), 3);

        let slugs: Vec<&str> = summaries.iter().map(|s| s.slug.as_str()).collect();
        assert!(slugs.contains(&"development"));
        assert!(slugs.contains(&"staging"));
        assert!(slugs.contains(&"production"));
    }

    #[test]
    fn test_list_environments_returns_empty_when_dir_not_exists() {
        let dir = tempdir().unwrap();
        let ws_dir = dir.path();

        let summaries = list_environments(ws_dir).unwrap();
        assert!(summaries.is_empty());
    }

    #[test]
    fn test_read_secrets_returns_empty_hashmap_when_file_not_exists() {
        let dir = tempdir().unwrap();
        let app_data = dir.path();

        let secrets = read_secrets(app_data, "workspace-123", "production").unwrap();
        assert!(secrets.is_empty());
    }

    #[test]
    fn test_write_and_read_secrets_roundtrip() {
        let dir = tempdir().unwrap();
        let app_data = dir.path();

        let mut secrets = HashMap::new();
        secrets.insert("API_KEY".to_string(), "my-secret-key".to_string());
        secrets.insert("DB_PASSWORD".to_string(), "secure-password".to_string());

        write_secrets(app_data, "workspace-123", "production", &secrets).unwrap();

        let loaded = read_secrets(app_data, "workspace-123", "production").unwrap();
        assert_eq!(loaded.get("API_KEY").unwrap(), "my-secret-key");
        assert_eq!(loaded.get("DB_PASSWORD").unwrap(), "secure-password");
    }

    #[test]
    fn test_delete_environment_removes_env_and_secrets() {
        let dir = tempdir().unwrap();
        let ws_dir = dir.path();
        let app_data = dir.path().join("appdata");
        let workspace_id = "workspace-test";

        create_environment(ws_dir, "Temp").unwrap();

        let mut secrets = HashMap::new();
        secrets.insert("KEY".to_string(), "value".to_string());
        write_secrets(&app_data, workspace_id, "temp", &secrets).unwrap();

        // Verify both exist
        assert!(ws_dir.join("environments").join("temp.json").exists());
        assert!(app_data.join("secrets").join(workspace_id).join("temp.json").exists());

        delete_environment(ws_dir, &app_data, workspace_id, "temp").unwrap();

        // Both should be gone
        assert!(!ws_dir.join("environments").join("temp.json").exists());
        assert!(!app_data.join("secrets").join(workspace_id).join("temp.json").exists());
    }
}
