mod collections;
mod commands;

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
        ]);

    #[cfg(debug_assertions)]
    builder
        .export(Typescript::default(), "../src/bindings.ts")
        .expect("Failed to export TS bindings");

    tauri::Builder::default()
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
