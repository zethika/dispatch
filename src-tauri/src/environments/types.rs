use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct EnvironmentFile {
    pub name: String,
    pub variables: Vec<EnvironmentVariable>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct EnvironmentVariable {
    pub key: String,
    pub value: String,
    pub secret: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct EnvironmentSummary {
    pub slug: String,
    pub name: String,
}
