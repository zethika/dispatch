use serde::{Deserialize, Serialize};
use specta::Type;
use tokio::sync::oneshot;

/// Current sync state for a workspace.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum SyncStatus {
    Synced,
    Syncing,
    Conflict,
    Error,
    Local,
}

/// Messages sent to the git actor via mpsc channel.
pub enum SyncMessage {
    CommitAndPush {
        workspace_id: String,
        local_path: String,
        clone_url: String,
        token: String,
        reply: oneshot::Sender<Result<SyncResult, String>>,
    },
    Pull {
        workspace_id: String,
        local_path: String,
        clone_url: String,
        token: String,
        reply: oneshot::Sender<Result<SyncResult, String>>,
    },
}

/// Result returned from actor operations.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum SyncResult {
    /// Commit+push completed. `had_changes` is false if working tree was clean.
    Pushed { had_changes: bool },
    /// Remote was already up-to-date; nothing to do.
    UpToDate,
    /// Pull completed. `conflicts` lists file paths resolved with remote-wins.
    Pulled { conflicts: Vec<String> },
}

/// Payload for the `sync-status-changed` Tauri event.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatusPayload {
    pub workspace_id: String,
    /// "synced" | "syncing" | "conflict" | "error" | "local"
    pub status: String,
    pub message: Option<String>,
    pub conflicted_files: Vec<String>,
}
