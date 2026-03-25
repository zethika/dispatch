use serde::{Deserialize, Serialize};
use specta::Type;

use crate::collections::types::{KeyValueEntry, RequestAuth, RequestBody};

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct HttpResponse {
    pub status: u16,
    pub duration_ms: u32,
    pub headers: Vec<KeyValueEntry>,
    pub body: String,
}

pub async fn execute(
    method: String,
    url: String,
    headers: Vec<KeyValueEntry>,
    query_params: Vec<KeyValueEntry>,
    body: Option<RequestBody>,
    auth: Option<RequestAuth>,
) -> anyhow::Result<HttpResponse> {
    let client = tauri_plugin_http::reqwest::Client::new();
    let start = std::time::Instant::now();

    let http_method = tauri_plugin_http::reqwest::Method::from_bytes(method.to_uppercase().as_bytes())?;

    let mut builder = client.request(http_method, &url);

    // Apply enabled query params
    let params_vec: Vec<(&str, &str)> = query_params
        .iter()
        .filter(|p| p.enabled)
        .map(|p| (p.key.as_str(), p.value.as_str()))
        .collect();
    if !params_vec.is_empty() {
        builder = builder.query(&params_vec);
    }

    // Apply enabled headers
    for h in headers.iter().filter(|h| h.enabled) {
        builder = builder.header(&h.key, &h.value);
    }

    // Apply bearer auth
    if let Some(ref a) = auth {
        if a.auth_type == "bearer" && !a.token.is_empty() {
            builder = builder.bearer_auth(&a.token);
        }
    }

    // Apply body
    if let Some(ref b) = body {
        if b.body_type == "json" && !b.content.is_empty() {
            // Check if any enabled header has content-type (case-insensitive)
            let has_content_type = headers
                .iter()
                .any(|h| h.enabled && h.key.to_lowercase() == "content-type");
            if !has_content_type {
                builder = builder.header("Content-Type", "application/json");
            }
            builder = builder.body(b.content.clone());
        }
    }

    let response = builder.send().await?;
    let duration_ms = start.elapsed().as_millis() as u32;
    let status = response.status().as_u16();

    // Collect response headers
    let resp_headers: Vec<KeyValueEntry> = response
        .headers()
        .iter()
        .map(|(name, value)| KeyValueEntry {
            key: name.to_string(),
            value: value.to_str().unwrap_or("").to_string(),
            enabled: true,
        })
        .collect();

    let body_text = response.text().await.unwrap_or_default();

    Ok(HttpResponse {
        status,
        duration_ms,
        headers: resp_headers,
        body: body_text,
    })
}
