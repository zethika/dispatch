#[cfg(test)]
mod tests {
    use crate::sync::actor::is_network_error;

    #[test]
    fn test_is_network_error_detects_connection_failures() {
        assert!(is_network_error("could not connect to remote"));
        assert!(is_network_error("Network is unreachable"));
        assert!(is_network_error("connection timed out"));
        assert!(is_network_error("Connection refused"));
        assert!(is_network_error("SSL error during handshake"));
    }

    #[test]
    fn test_is_network_error_rejects_auth_failures() {
        assert!(!is_network_error("authentication failed for user"));
        assert!(!is_network_error("not_authenticated"));
        assert!(!is_network_error("merge conflict in file.json"));
        assert!(!is_network_error("reference not found"));
    }

    #[test]
    fn test_notify_change_message_variant_exists() {
        use crate::sync::types::SyncMessage;
        // Verify the variant can be constructed
        let _msg = SyncMessage::NotifyChange {
            workspace_id: "test".to_string(),
            local_path: "/tmp/test".to_string(),
            clone_url: "https://github.com/test/repo.git".to_string(),
            token: "ghp_test".to_string(),
        };
    }

    #[test]
    fn test_offline_status_variant_exists() {
        use crate::sync::types::SyncStatus;
        let status = SyncStatus::Offline;
        // Verify it serializes correctly (SyncStatus derives Serialize)
        let json = serde_json::to_string(&status).unwrap();
        assert!(json.contains("Offline") || json.contains("offline"));
    }
}
