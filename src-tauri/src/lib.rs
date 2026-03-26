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
            // First-launch: ensure default workspace exists (D-08)
            let app_data = app.path().app_data_dir().expect("Failed to get app data dir");
            collections::io::ensure_default_workspace(&app_data)
                .expect("Failed to ensure default workspace");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
