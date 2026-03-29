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
    Offline,
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
    /// Fire-and-forget notification that workspace content has changed.
    /// The actor will debounce these and fire a commit+push after 3s of inactivity.
    NotifyChange {
        workspace_id: String,
        local_path: String,
        clone_url: String,
        token: String,
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
///
/// Status values: "synced" | "syncing" | "conflict" | "error" | "local" | "offline"
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatusPayload {
    pub workspace_id: String,
    pub status: String,
    pub message: Option<String>,
    pub conflicted_files: Vec<String>,
}
