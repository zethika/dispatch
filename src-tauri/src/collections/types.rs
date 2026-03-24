use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct WorkspaceManifest {
    pub id: String,
    pub name: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CollectionManifest {
    pub name: String,
    pub description: String,
    pub order: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct FolderManifest {
    pub name: String,
    pub order: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RequestFile {
    pub name: String,
    pub method: String,
    pub url: String,
    pub headers: Vec<KeyValueEntry>,
    #[serde(rename = "queryParams")]
    pub query_params: Vec<KeyValueEntry>,
    pub body: Option<RequestBody>,
    pub auth: Option<RequestAuth>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct KeyValueEntry {
    pub key: String,
    pub value: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RequestBody {
    #[serde(rename = "type")]
    pub body_type: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RequestAuth {
    #[serde(rename = "type")]
    pub auth_type: String,
    pub token: String,
}

// Tree items returned to frontend
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct WorkspaceTree {
    pub id: String,
    pub name: String,
    pub collections: Vec<CollectionItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CollectionItem {
    pub slug: String,
    pub name: String,
    pub children: Vec<TreeChild>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type")]
pub enum TreeChild {
    #[serde(rename = "folder")]
    Folder(FolderItem),
    #[serde(rename = "request")]
    Request(RequestItem),
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct FolderItem {
    pub slug: String,
    pub name: String,
    pub children: Vec<TreeChild>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RequestItem {
    pub slug: String,
    pub name: String,
    pub method: String,
}
