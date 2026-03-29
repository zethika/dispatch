mod auth;
mod collections;
mod commands;
mod environments;
mod github;
mod http;
mod sync;
mod workspace;

use tauri::Manager;
use tauri_specta::{collect_commands, Builder};
use specta_typescript::Typescript;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            commands::ping,
            commands::collections::ensure_default_workspace,
            commands::collections::get_workspace_ids,
            commands::collections::load_workspace,
            commands::collections::create_collection,
            commands::collections::create_folder,
            commands::collections::create_request,
            commands::collections::rename_node,
            commands::collections::delete_node,
            commands::collections::delete_collection,
            commands::collections::rename_collection,
            commands::collections::duplicate_request,
            commands::http::send_request,
            commands::http::load_request,
            commands::http::save_request,
            commands::environments::list_environments,
            commands::environments::load_environment,
            commands::environments::save_environment,
            commands::environments::create_environment,
            commands::environments::delete_environment,
            commands::environments::rename_environment,
            commands::environments::load_secret_values,
            commands::environments::save_secret_values,
            commands::auth::initiate_login,
            commands::auth::poll_login,
            commands::auth::logout,
            commands::auth::get_auth_state,
            commands::github::list_repos,
            commands::workspace::connect_workspace,
            commands::workspace::disconnect_workspace,
            commands::workspace::list_workspaces,
            commands::sync::sync_workspace,
            commands::sync::pull_workspace,
            commands::sync::get_sync_status,
            commands::sync::notify_change,
        ]);

    #[cfg(debug_assertions)]
    builder
        .export(Typescript::default(), "../src/bindings.ts")
        .expect("Failed to export TS bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_secure_storage::init())
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);
            // Initialize the singleton git sync actor (D-01/D-02)
            app.manage(sync::ActorHandle::new(app.handle().clone()));
            // Spawn periodic 30-second pull timer for all GitHub-backed workspaces (SYNC-02).
            {
                let periodic_actor = app.state::<sync::ActorHandle>().inner().clone();
                let periodic_app = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    use tokio::time::{interval, Duration};
                    let mut ticker = interval(Duration::from_secs(30));
                    ticker.tick().await; // consume immediate first tick so pull doesn't fire on startup
                    loop {
                        ticker.tick().await;
                        let Ok(entries) = workspace::registry::load_registry(&periodic_app) else { continue; };
                        for entry in entries.iter().filter(|e| !e.is_local && e.clone_url.is_some()) {
                            let Ok(Some(token)) = auth::token::load_token(&periodic_app) else { continue; };
                            let _ = periodic_actor
                                .pull(
                                    entry.id.clone(),
                                    entry.local_path.clone(),
                                    entry.clone_url.clone().unwrap(),
                                    token,
                                )
                                .await;
                        }
                    }
                });
            }
            // First-launch: ensure default workspace exists (D-08)
            let app_data = app.path().app_data_dir().expect("Failed to get app data dir");
            collections::io::ensure_default_workspace(&app_data)
                .expect("Failed to ensure default workspace");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
