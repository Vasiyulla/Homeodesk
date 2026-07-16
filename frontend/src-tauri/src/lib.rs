// Homeopathy Case Manager — Tauri v2 Desktop Application
// This is the Rust entry point that initializes the Tauri runtime and
// serves the React frontend as a native desktop window.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
