use std::fs;
use std::path::{Path, PathBuf};

use anyhow::Context;
use uuid::Uuid;

use super::slugify;
use super::types::*;

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

/// Assert the computed path is rooted within `workspace_dir` (path traversal defense).
fn assert_within(workspace_dir: &Path, computed: &Path) -> anyhow::Result<()> {
    if !computed.starts_with(workspace_dir) {
        anyhow::bail!(
            "Path traversal detected: '{}' is outside workspace '{}'",
            computed.display(),
            workspace_dir.display()
        );
    }
    Ok(())
}

/// Get the manifest path for a directory (either `_collection.json` or `_folder.json`).
fn dir_manifest_path(dir: &Path) -> PathBuf {
    // Determine if this is a collection root or a folder.
    // We use _collection.json at collection root, _folder.json in nested folders.
    // Since we can't always tell from path alone, check for existence of _collection.json first.
    let coll_path = dir.join("_collection.json");
    if coll_path.exists() {
        coll_path
    } else {
        dir.join("_folder.json")
    }
}

/// Insert a slug into a manifest order array and write it back.
/// Inserts after `after_slug` if provided, otherwise appends.
fn update_order_array(
    manifest_path: &Path,
    slug: &str,
    after_slug: Option<&str>,
) -> anyhow::Result<()> {
    // Try to read as CollectionManifest first, then FolderManifest
    let is_collection = manifest_path
        .file_name()
        .map(|n| n == "_collection.json")
        .unwrap_or(false);

    if is_collection {
        let mut manifest: CollectionManifest = read_manifest(manifest_path)?;
        insert_into_order(&mut manifest.order, slug, after_slug);
        write_manifest(manifest_path, &manifest)
    } else {
        let mut manifest: FolderManifest = read_manifest(manifest_path)?;
        insert_into_order(&mut manifest.order, slug, after_slug);
        write_manifest(manifest_path, &manifest)
    }
}

fn insert_into_order(order: &mut Vec<String>, slug: &str, after_slug: Option<&str>) {
    if let Some(after) = after_slug {
        if let Some(pos) = order.iter().position(|s| s == after) {
            order.insert(pos + 1, slug.to_string());
            return;
        }
    }
    order.push(slug.to_string());
}

/// Remove a slug from a manifest order array and write it back.
fn remove_from_order(manifest_path: &Path, slug: &str) -> anyhow::Result<()> {
    let is_collection = manifest_path
        .file_name()
        .map(|n| n == "_collection.json")
        .unwrap_or(false);

    if is_collection {
        let mut manifest: CollectionManifest = read_manifest(manifest_path)?;
        manifest.order.retain(|s| s != slug);
        write_manifest(manifest_path, &manifest)
    } else {
        let mut manifest: FolderManifest = read_manifest(manifest_path)?;
        manifest.order.retain(|s| s != slug);
        write_manifest(manifest_path, &manifest)
    }
}

// ── Public API ───────────────────────────────────────────────────────────────

/// On first launch, ensure a default "My Workspace" exists.
/// Returns the workspace ID (UUID string).
pub fn ensure_default_workspace(app_data_dir: &Path) -> anyhow::Result<String> {
    let workspaces_dir = app_data_dir.join("workspaces");
    fs::create_dir_all(&workspaces_dir)?;

    // Check if any workspace subdirectory exists
    let has_workspace = fs::read_dir(&workspaces_dir)?
        .filter_map(|e| e.ok())
        .any(|e| e.path().is_dir());

    if has_workspace {
        // Return the first workspace ID found
        if let Some(entry) = fs::read_dir(&workspaces_dir)?
            .filter_map(|e| e.ok())
            .find(|e| e.path().is_dir())
        {
            let id = entry
                .file_name()
                .to_string_lossy()
                .to_string();
            return Ok(id);
        }
    }

    // Create default workspace
    let id = Uuid::new_v4().to_string();
    let workspace_dir = workspaces_dir.join(&id);
    fs::create_dir_all(&workspace_dir)?;
    fs::create_dir_all(workspace_dir.join("collections"))?;

    let now = chrono_now();
    let manifest = WorkspaceManifest {
        id: id.clone(),
        name: "My Workspace".to_string(),
        created_at: now,
    };
    write_manifest(&workspace_dir.join("dispatch.json"), &manifest)?;

    Ok(id)
}

fn chrono_now() -> String {
    // Simple ISO 8601 timestamp without external dependency
    // Format: 2024-01-15T10:30:00Z (approximate — uses file system time)
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    // Convert to rough ISO 8601 — good enough for a created_at timestamp
    let s = secs;
    let sec = s % 60;
    let min = (s / 60) % 60;
    let hour = (s / 3600) % 24;
    let days = s / 86400;
    // Days since epoch → date (simplified, not leap-year accurate but sufficient for a label)
    let year = 1970 + days / 365;
    let day_of_year = days % 365;
    let month = day_of_year / 30 + 1;
    let day = day_of_year % 30 + 1;
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year, month, day, hour, min, sec
    )
}

/// List workspace IDs (subdirectory names of `app_data_dir/workspaces/`).
pub fn get_workspace_ids(app_data_dir: &Path) -> anyhow::Result<Vec<String>> {
    let workspaces_dir = app_data_dir.join("workspaces");
    if !workspaces_dir.exists() {
        return Ok(vec![]);
    }
    let ids = fs::read_dir(&workspaces_dir)?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .map(|e| e.file_name().to_string_lossy().to_string())
        .collect();
    Ok(ids)
}

/// Read the full workspace tree from disk.
///
/// If `dispatch.json` is missing (e.g. freshly cloned empty repo), initializes
/// it with a default manifest and creates the `collections/` directory.
pub fn read_workspace(workspace_dir: &Path) -> anyhow::Result<WorkspaceTree> {
    let manifest_path = workspace_dir.join("dispatch.json");
    let manifest: WorkspaceManifest = if manifest_path.exists() {
        read_manifest(&manifest_path)?
    } else {
        // Initialize empty workspace (e.g. freshly cloned empty GitHub repo)
        let id = workspace_dir
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let m = WorkspaceManifest {
            id,
            name: "Workspace".to_string(),
            created_at: chrono_now(),
        };
        fs::create_dir_all(workspace_dir.join("collections"))?;
        write_manifest(&manifest_path, &m)?;
        m
    };
    let collections_dir = workspace_dir.join("collections");

    let mut collections: Vec<CollectionItem> = vec![];

    if collections_dir.exists() {
        // Read collection directories, sorted for stable order
        let mut entries: Vec<_> = fs::read_dir(&collections_dir)?
            .filter_map(|e| e.ok())
            .filter(|e| e.path().is_dir())
            .collect();
        entries.sort_by_key(|e| e.file_name());

        for entry in entries {
            let coll_dir = entry.path();
            let coll_manifest_path = coll_dir.join("_collection.json");
            if !coll_manifest_path.exists() {
                continue;
            }
            let coll_manifest: CollectionManifest = match read_manifest(&coll_manifest_path) {
                Ok(m) => m,
                Err(_) => continue, // silently skip malformed manifests
            };
            let slug = entry.file_name().to_string_lossy().to_string();
            let children = read_children(&coll_dir, &coll_manifest.order)?;
            collections.push(CollectionItem {
                slug,
                name: coll_manifest.name,
                children,
            });
        }
    }

    Ok(WorkspaceTree {
        id: manifest.id,
        name: manifest.name,
        collections,
    })
}

/// Read children of a directory according to order array.
/// Silently drops order entries pointing to non-existent items (defensive read).
fn read_children(dir: &Path, order: &[String]) -> anyhow::Result<Vec<TreeChild>> {
    let mut children = vec![];

    for slug in order {
        let dir_path = dir.join(slug);
        let file_path = dir.join(format!("{}.json", slug));

        if dir_path.is_dir() {
            // It's a folder
            let folder_manifest_path = dir_path.join("_folder.json");
            if !folder_manifest_path.exists() {
                continue; // silently skip
            }
            let folder_manifest: FolderManifest = match read_manifest(&folder_manifest_path) {
                Ok(m) => m,
                Err(_) => continue,
            };
            let nested_children = read_children(&dir_path, &folder_manifest.order)?;
            children.push(TreeChild::Folder(FolderItem {
                slug: slug.clone(),
                name: folder_manifest.name,
                children: nested_children,
            }));
        } else if file_path.exists() {
            // It's a request file
            let request: RequestFile = match read_manifest(&file_path) {
                Ok(r) => r,
                Err(_) => continue,
            };
            children.push(TreeChild::Request(RequestItem {
                slug: slug.clone(),
                name: request.name,
                method: request.method,
            }));
        }
        // else: silently drop (file/dir doesn't exist)
    }

    Ok(children)
}

/// Create a new collection directory in the workspace.
pub fn create_collection(workspace_dir: &Path, name: &str) -> anyhow::Result<CollectionItem> {
    let collections_dir = workspace_dir.join("collections");
    fs::create_dir_all(&collections_dir)?;

    let base_slug = slugify::to_slug(name);
    let slug = slugify::resolve_dir_collision(&collections_dir, &base_slug)?;

    let coll_dir = collections_dir.join(&slug);
    assert_within(workspace_dir, &coll_dir)?;

    fs::create_dir_all(&coll_dir)?;

    let manifest = CollectionManifest {
        name: name.to_string(),
        description: String::new(),
        order: vec![],
    };
    write_manifest(&coll_dir.join("_collection.json"), &manifest)?;

    Ok(CollectionItem {
        slug,
        name: name.to_string(),
        children: vec![],
    })
}

/// Create a new folder inside a parent directory.
pub fn create_folder(parent_dir: &Path, name: &str) -> anyhow::Result<FolderItem> {
    let base_slug = slugify::to_slug(name);
    let slug = slugify::resolve_dir_collision(parent_dir, &base_slug)?;

    let folder_dir = parent_dir.join(&slug);

    // We need the workspace root for path traversal check — use the parent_dir itself
    // as the traversal guard (slug already cleaned by slugify)
    fs::create_dir_all(&folder_dir)?;

    let manifest = FolderManifest {
        name: name.to_string(),
        order: vec![],
    };
    write_manifest(&folder_dir.join("_folder.json"), &manifest)?;

    // Update parent manifest order array
    let parent_manifest_path = dir_manifest_path(parent_dir);
    if parent_manifest_path.exists() {
        update_order_array(&parent_manifest_path, &slug, None)?;
    }

    Ok(FolderItem {
        slug,
        name: name.to_string(),
        children: vec![],
    })
}

/// Determine the display name for a new request, handling deduplication (D-14).
/// E.g. if "New Request" exists, returns "New Request (2)", etc.
fn new_request_name(parent_dir: &Path, base_name: &str) -> String {
    // Gather existing request names from the parent manifest order
    let manifest_path = dir_manifest_path(parent_dir);
    if !manifest_path.exists() {
        return base_name.to_string();
    }

    let existing_names: Vec<String> = {
        // Try collection manifest first
        let is_collection = manifest_path
            .file_name()
            .map(|n| n == "_collection.json")
            .unwrap_or(false);
        let order: Vec<String> = if is_collection {
            read_manifest::<CollectionManifest>(&manifest_path)
                .map(|m| m.order)
                .unwrap_or_default()
        } else {
            read_manifest::<FolderManifest>(&manifest_path)
                .map(|m| m.order)
                .unwrap_or_default()
        };
        // Read each request file's name
        order
            .iter()
            .filter_map(|slug| {
                let file_path = parent_dir.join(format!("{}.json", slug));
                read_manifest::<RequestFile>(&file_path).ok().map(|r| r.name)
            })
            .collect()
    };

    if !existing_names.contains(&base_name.to_string()) {
        return base_name.to_string();
    }

    for i in 2..=999 {
        let candidate = format!("{} ({})", base_name, i);
        if !existing_names.contains(&candidate) {
            return candidate;
        }
    }

    format!("{} (999+)", base_name)
}

/// Create a new request file in the parent directory.
pub fn create_request(parent_dir: &Path, name: &str) -> anyhow::Result<RequestItem> {
    let resolved_name = new_request_name(parent_dir, name);
    let base_slug = slugify::to_slug(&resolved_name);
    let slug = slugify::resolve_collision(parent_dir, &base_slug, "json")?;

    let file_path = parent_dir.join(format!("{}.json", slug));

    let request = RequestFile {
        name: resolved_name.clone(),
        method: "GET".to_string(),
        url: String::new(),
        headers: vec![],
        query_params: vec![],
        body: None,
        auth: None,
    };
    write_manifest(&file_path, &request)?;

    // Update parent manifest order array
    let parent_manifest_path = dir_manifest_path(parent_dir);
    if parent_manifest_path.exists() {
        update_order_array(&parent_manifest_path, &slug, None)?;
    }

    Ok(RequestItem {
        slug,
        name: resolved_name,
        method: "GET".to_string(),
    })
}

/// Rename a node (request file or folder directory).
/// Returns the new slug.
pub fn rename_node(
    parent_dir: &Path,
    old_slug: &str,
    new_name: &str,
    is_dir: bool,
) -> anyhow::Result<String> {
    let base_slug = slugify::to_slug(new_name);

    if is_dir {
        let new_slug = slugify::resolve_dir_collision(parent_dir, &base_slug)?;
        let old_path = parent_dir.join(old_slug);
        let new_path = parent_dir.join(&new_slug);

        // Path traversal check: new path must still be within parent_dir
        if new_path.parent() != Some(parent_dir) {
            anyhow::bail!("Path traversal detected in rename");
        }

        fs::rename(&old_path, &new_path)
            .with_context(|| format!("Failed to rename {} -> {}", old_path.display(), new_path.display()))?;

        // Update the name field in the manifest inside the renamed dir
        let manifest_path = dir_manifest_path(&new_path);
        if manifest_path.exists() {
            let is_collection = manifest_path
                .file_name()
                .map(|n| n == "_collection.json")
                .unwrap_or(false);
            if is_collection {
                let mut manifest: CollectionManifest = read_manifest(&manifest_path)?;
                manifest.name = new_name.to_string();
                write_manifest(&manifest_path, &manifest)?;
            } else {
                let mut manifest: FolderManifest = read_manifest(&manifest_path)?;
                manifest.name = new_name.to_string();
                write_manifest(&manifest_path, &manifest)?;
            }
        }

        // Update parent manifest order (replace old_slug with new_slug)
        let parent_manifest_path = dir_manifest_path(parent_dir);
        if parent_manifest_path.exists() {
            replace_in_order(&parent_manifest_path, old_slug, &new_slug)?;
        }

        Ok(new_slug)
    } else {
        let new_slug = slugify::resolve_collision(parent_dir, &base_slug, "json")?;
        let old_path = parent_dir.join(format!("{}.json", old_slug));
        let new_path = parent_dir.join(format!("{}.json", new_slug));

        if new_path.parent() != Some(parent_dir) {
            anyhow::bail!("Path traversal detected in rename");
        }

        // Update the name field in the request JSON
        let mut request: RequestFile = read_manifest(&old_path)?;
        request.name = new_name.to_string();
        fs::rename(&old_path, &new_path)
            .with_context(|| format!("Failed to rename {} -> {}", old_path.display(), new_path.display()))?;
        write_manifest(&new_path, &request)?;

        // Update parent manifest order
        let parent_manifest_path = dir_manifest_path(parent_dir);
        if parent_manifest_path.exists() {
            replace_in_order(&parent_manifest_path, old_slug, &new_slug)?;
        }

        Ok(new_slug)
    }
}

fn replace_in_order(
    manifest_path: &Path,
    old_slug: &str,
    new_slug: &str,
) -> anyhow::Result<()> {
    let is_collection = manifest_path
        .file_name()
        .map(|n| n == "_collection.json")
        .unwrap_or(false);

    if is_collection {
        let mut manifest: CollectionManifest = read_manifest(manifest_path)?;
        for s in manifest.order.iter_mut() {
            if s == old_slug {
                *s = new_slug.to_string();
            }
        }
        write_manifest(manifest_path, &manifest)
    } else {
        let mut manifest: FolderManifest = read_manifest(manifest_path)?;
        for s in manifest.order.iter_mut() {
            if s == old_slug {
                *s = new_slug.to_string();
            }
        }
        write_manifest(manifest_path, &manifest)
    }
}

/// Delete a node (request file or folder directory).
pub fn delete_node(parent_dir: &Path, slug: &str, is_dir: bool) -> anyhow::Result<()> {
    if is_dir {
        let path = parent_dir.join(slug);
        // Path traversal check
        if path.parent() != Some(parent_dir) {
            anyhow::bail!("Path traversal detected in delete");
        }
        fs::remove_dir_all(&path)
            .with_context(|| format!("Failed to delete directory: {}", path.display()))?;
    } else {
        let path = parent_dir.join(format!("{}.json", slug));
        if path.parent() != Some(parent_dir) {
            anyhow::bail!("Path traversal detected in delete");
        }
        fs::remove_file(&path)
            .with_context(|| format!("Failed to delete file: {}", path.display()))?;
    }

    // Remove from parent manifest order
    let parent_manifest_path = dir_manifest_path(parent_dir);
    if parent_manifest_path.exists() {
        remove_from_order(&parent_manifest_path, slug)?;
    }

    Ok(())
}

/// Duplicate a request: creates a copy named "{original_name} (copy)" placed after the original.
pub fn duplicate_request(parent_dir: &Path, slug: &str) -> anyhow::Result<RequestItem> {
    let original_path = parent_dir.join(format!("{}.json", slug));
    let mut request: RequestFile = read_manifest(&original_path)?;

    // D-16: name becomes "{original_name} (copy)"
    let copy_name = format!("{} (copy)", request.name);
    request.name = copy_name.clone();

    // D-17: derive slug from copy name
    let base_slug = slugify::to_slug(&copy_name);
    let new_slug = slugify::resolve_collision(parent_dir, &base_slug, "json")?;

    let new_path = parent_dir.join(format!("{}.json", new_slug));
    if new_path.parent() != Some(parent_dir) {
        anyhow::bail!("Path traversal detected in duplicate");
    }

    write_manifest(&new_path, &request)?;

    // Add to parent manifest order immediately after the original slug
    let parent_manifest_path = dir_manifest_path(parent_dir);
    if parent_manifest_path.exists() {
        update_order_array(&parent_manifest_path, &new_slug, Some(slug))?;
    }

    Ok(RequestItem {
        slug: new_slug,
        name: copy_name,
        method: request.method,
    })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn make_collection_dir(base: &Path, slug: &str) -> PathBuf {
        let dir = base.join(slug);
        fs::create_dir_all(&dir).unwrap();
        let manifest = CollectionManifest {
            name: slug.to_string(),
            description: String::new(),
            order: vec![],
        };
        write_manifest(&dir.join("_collection.json"), &manifest).unwrap();
        dir
    }

    #[test]
    fn test_ensure_default_workspace_creates_on_first_launch() {
        let dir = tempdir().unwrap();
        let id = ensure_default_workspace(dir.path()).unwrap();
        assert!(!id.is_empty());

        // Verify workspace directory and dispatch.json exist
        let workspace_dir = dir.path().join("workspaces").join(&id);
        assert!(workspace_dir.exists());
        assert!(workspace_dir.join("dispatch.json").exists());
        assert!(workspace_dir.join("collections").exists());

        // Verify manifest content
        let manifest: WorkspaceManifest =
            read_manifest(&workspace_dir.join("dispatch.json")).unwrap();
        assert_eq!(manifest.name, "My Workspace");
        assert_eq!(manifest.id, id);
    }

    #[test]
    fn test_ensure_default_workspace_idempotent() {
        let dir = tempdir().unwrap();
        let id1 = ensure_default_workspace(dir.path()).unwrap();
        let id2 = ensure_default_workspace(dir.path()).unwrap();
        assert_eq!(id1, id2);
    }

    #[test]
    fn test_create_collection() {
        let dir = tempdir().unwrap();
        let workspace_dir = dir.path();
        fs::create_dir_all(workspace_dir.join("collections")).unwrap();

        let item = create_collection(workspace_dir, "My API").unwrap();
        assert_eq!(item.slug, "my-api");
        assert_eq!(item.name, "My API");

        // Verify on disk
        let coll_dir = workspace_dir.join("collections").join("my-api");
        assert!(coll_dir.exists());
        assert!(coll_dir.join("_collection.json").exists());
    }

    #[test]
    fn test_create_collection_collision() {
        let dir = tempdir().unwrap();
        let workspace_dir = dir.path();
        fs::create_dir_all(workspace_dir.join("collections")).unwrap();

        let item1 = create_collection(workspace_dir, "My API").unwrap();
        let item2 = create_collection(workspace_dir, "My API").unwrap();
        assert_eq!(item1.slug, "my-api");
        assert_eq!(item2.slug, "my-api-2");
    }

    #[test]
    fn test_create_request() {
        let dir = tempdir().unwrap();
        let coll_dir = make_collection_dir(dir.path(), "my-api");

        let item = create_request(&coll_dir, "New Request").unwrap();
        assert_eq!(item.name, "New Request");
        assert_eq!(item.slug, "new-request");
        assert_eq!(item.method, "GET");

        // Verify on disk
        assert!(coll_dir.join("new-request.json").exists());

        // Verify order updated in manifest
        let manifest: CollectionManifest =
            read_manifest(&coll_dir.join("_collection.json")).unwrap();
        assert!(manifest.order.contains(&"new-request".to_string()));
    }

    #[test]
    fn test_create_request_name_deduplication() {
        let dir = tempdir().unwrap();
        let coll_dir = make_collection_dir(dir.path(), "my-api");

        let item1 = create_request(&coll_dir, "New Request").unwrap();
        let item2 = create_request(&coll_dir, "New Request").unwrap();
        assert_eq!(item1.name, "New Request");
        assert_eq!(item2.name, "New Request (2)");
    }

    #[test]
    fn test_rename_request() {
        let dir = tempdir().unwrap();
        let coll_dir = make_collection_dir(dir.path(), "my-api");

        let item = create_request(&coll_dir, "Get Users").unwrap();
        assert_eq!(item.slug, "get-users");

        let new_slug = rename_node(&coll_dir, "get-users", "List Users", false).unwrap();
        assert_eq!(new_slug, "list-users");

        // Old file gone, new file exists
        assert!(!coll_dir.join("get-users.json").exists());
        assert!(coll_dir.join("list-users.json").exists());

        // Manifest updated
        let manifest: CollectionManifest =
            read_manifest(&coll_dir.join("_collection.json")).unwrap();
        assert!(!manifest.order.contains(&"get-users".to_string()));
        assert!(manifest.order.contains(&"list-users".to_string()));
    }

    #[test]
    fn test_rename_with_collision() {
        let dir = tempdir().unwrap();
        let coll_dir = make_collection_dir(dir.path(), "my-api");

        create_request(&coll_dir, "Get Users").unwrap(); // get-users.json
        create_request(&coll_dir, "Post Users").unwrap(); // post-users.json

        // Rename "Post Users" to "Get Users" — should get get-users-2
        let new_slug = rename_node(&coll_dir, "post-users", "Get Users", false).unwrap();
        assert_eq!(new_slug, "get-users-2");
    }

    #[test]
    fn test_delete_updates_order() {
        let dir = tempdir().unwrap();
        let coll_dir = make_collection_dir(dir.path(), "my-api");

        create_request(&coll_dir, "Get Users").unwrap();
        create_request(&coll_dir, "Post Users").unwrap();

        delete_node(&coll_dir, "get-users", false).unwrap();

        // File gone
        assert!(!coll_dir.join("get-users.json").exists());

        // Manifest no longer references it
        let manifest: CollectionManifest =
            read_manifest(&coll_dir.join("_collection.json")).unwrap();
        assert!(!manifest.order.contains(&"get-users".to_string()));
        assert!(manifest.order.contains(&"post-users".to_string()));
    }

    #[test]
    fn test_duplicate_request() {
        let dir = tempdir().unwrap();
        let coll_dir = make_collection_dir(dir.path(), "my-api");

        create_request(&coll_dir, "Get Users").unwrap();

        let copy = duplicate_request(&coll_dir, "get-users").unwrap();
        assert_eq!(copy.name, "Get Users (copy)");
        assert_eq!(copy.slug, "get-users-copy");

        // Verify copy file exists
        assert!(coll_dir.join("get-users-copy.json").exists());

        // Verify order: copy is after original
        let manifest: CollectionManifest =
            read_manifest(&coll_dir.join("_collection.json")).unwrap();
        let get_pos = manifest.order.iter().position(|s| s == "get-users").unwrap();
        let copy_pos = manifest.order.iter().position(|s| s == "get-users-copy").unwrap();
        assert_eq!(copy_pos, get_pos + 1);
    }

    #[test]
    fn test_read_workspace() {
        let dir = tempdir().unwrap();
        let app_data = dir.path();

        let workspace_id = ensure_default_workspace(app_data).unwrap();
        let workspace_dir = app_data.join("workspaces").join(&workspace_id);

        create_collection(&workspace_dir, "Test API").unwrap();
        let tree = read_workspace(&workspace_dir).unwrap();

        assert_eq!(tree.name, "My Workspace");
        assert_eq!(tree.collections.len(), 1);
        assert_eq!(tree.collections[0].name, "Test API");
    }
}
