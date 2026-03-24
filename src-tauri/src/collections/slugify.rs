use std::path::Path;

/// Convert a display name to a URL-safe slug.
/// - Strips path traversal characters (`/`, `\`) first
/// - Lowercases the string
/// - Replaces non-alphanumeric characters with hyphens
/// - Collapses consecutive hyphens
/// - Trims leading/trailing hyphens
/// - Truncates to 60 characters (at a hyphen boundary if possible)
pub fn to_slug(name: &str) -> String {
    // Strip path traversal characters FIRST (security: Pitfall 6)
    let sanitized: String = name.chars().filter(|&c| c != '/' && c != '\\').collect();

    // Lowercase
    let lower = sanitized.to_lowercase();

    // Replace non-alphanumeric with hyphens
    let hyphenated: String = lower
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect();

    // Collapse consecutive hyphens
    let mut collapsed = String::new();
    let mut prev_hyphen = false;
    for c in hyphenated.chars() {
        if c == '-' {
            if !prev_hyphen {
                collapsed.push(c);
            }
            prev_hyphen = true;
        } else {
            collapsed.push(c);
            prev_hyphen = false;
        }
    }

    // Trim leading/trailing hyphens
    let trimmed = collapsed.trim_matches('-').to_string();

    // Truncate to 60 chars (try to break at hyphen boundary)
    if trimmed.len() <= 60 {
        if trimmed.is_empty() {
            "untitled".to_string()
        } else {
            trimmed
        }
    } else {
        let truncated = &trimmed[..60];
        // Find last hyphen to break cleanly
        if let Some(pos) = truncated.rfind('-') {
            if pos > 0 {
                trimmed[..pos].to_string()
            } else {
                truncated.to_string()
            }
        } else {
            truncated.to_string()
        }
    }
}

/// Resolve a file slug collision by appending numeric suffixes.
/// If `{base_slug}.{extension}` exists in `dir`, tries `{base_slug}-2.{extension}`
/// through `{base_slug}-999.{extension}`.
pub fn resolve_collision(
    dir: &Path,
    base_slug: &str,
    extension: &str,
) -> anyhow::Result<String> {
    let first_path = dir.join(format!("{}.{}", base_slug, extension));
    if !first_path.exists() {
        return Ok(base_slug.to_string());
    }

    for i in 2..=999 {
        let candidate = format!("{}-{}", base_slug, i);
        let path = dir.join(format!("{}.{}", candidate, extension));
        if !path.exists() {
            return Ok(candidate);
        }
    }

    anyhow::bail!("Could not resolve slug collision for '{}' after 999 attempts", base_slug)
}

/// Resolve a directory slug collision by appending numeric suffixes.
/// If `{base_slug}` directory exists in `dir`, tries `{base_slug}-2` through `{base_slug}-999`.
pub fn resolve_dir_collision(dir: &Path, base_slug: &str) -> anyhow::Result<String> {
    let first_path = dir.join(base_slug);
    if !first_path.exists() {
        return Ok(base_slug.to_string());
    }

    for i in 2..=999 {
        let candidate = format!("{}-{}", base_slug, i);
        let path = dir.join(&candidate);
        if !path.exists() {
            return Ok(candidate);
        }
    }

    anyhow::bail!(
        "Could not resolve directory slug collision for '{}' after 999 attempts",
        base_slug
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_basic_slug() {
        assert_eq!(to_slug("Hello World"), "hello-world");
        assert_eq!(to_slug("Get Users"), "get-users");
        assert_eq!(to_slug("My Collection"), "my-collection");
    }

    #[test]
    fn test_unicode_slug() {
        // Café: é is not ASCII alphanumeric → becomes hyphen, trimmed → "caf-restaurant"
        assert_eq!(to_slug("Café & Restaurant"), "caf-restaurant");
        // All-unicode (Japanese) → all non-ASCII replaced with hyphens → collapsed/trimmed → "untitled"
        assert_eq!(to_slug("日本語テスト"), "untitled");
        // Should not panic; result is always non-empty
        let result = to_slug("日本語テスト");
        assert!(!result.is_empty());
    }

    #[test]
    fn test_path_traversal_stripped() {
        // Slashes stripped first, then ".." becomes "--" → collapse → trim → "etcpasswd"
        assert_eq!(to_slug("../etc/passwd"), "etcpasswd");
        // After stripping / and \, the result should have no path separators
        let result = to_slug("../../evil");
        assert!(!result.contains('/'));
        assert!(!result.contains('\\'));

        assert_eq!(to_slug("foo/bar"), "foobar");
        assert_eq!(to_slug("foo\\bar"), "foobar");
        assert_eq!(to_slug("path/to/../file"), "pathto-file");
    }

    #[test]
    fn test_consecutive_hyphens_collapsed() {
        assert_eq!(to_slug("Hello   World"), "hello-world");
        assert_eq!(to_slug("foo---bar"), "foo-bar");
    }

    #[test]
    fn test_empty_and_special() {
        assert_eq!(to_slug(""), "untitled");
        assert_eq!(to_slug("---"), "untitled");
        assert_eq!(to_slug("!!!"), "untitled");
    }

    #[test]
    fn test_max_length() {
        let long_name = "a".repeat(80);
        let slug = to_slug(&long_name);
        assert!(slug.len() <= 60);
    }

    #[test]
    fn test_collision_resolution_file() {
        let dir = tempdir().unwrap();
        let path = dir.path();

        // No collision — should return base_slug
        let result = resolve_collision(path, "get-users", "json").unwrap();
        assert_eq!(result, "get-users");

        // Create the file to force collision
        std::fs::write(path.join("get-users.json"), "{}").unwrap();
        let result = resolve_collision(path, "get-users", "json").unwrap();
        assert_eq!(result, "get-users-2");

        // Create second to force third
        std::fs::write(path.join("get-users-2.json"), "{}").unwrap();
        let result = resolve_collision(path, "get-users", "json").unwrap();
        assert_eq!(result, "get-users-3");
    }

    #[test]
    fn test_dir_collision_resolution() {
        let dir = tempdir().unwrap();
        let path = dir.path();

        let result = resolve_dir_collision(path, "my-collection").unwrap();
        assert_eq!(result, "my-collection");

        std::fs::create_dir(path.join("my-collection")).unwrap();
        let result = resolve_dir_collision(path, "my-collection").unwrap();
        assert_eq!(result, "my-collection-2");
    }
}
