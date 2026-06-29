#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Books
            commands::books::list_books,
            commands::books::get_book,
            commands::books::create_book,
            commands::books::update_book,
            commands::books::delete_book,
            // Chapters
            commands::chapters::list_chapters,
            commands::chapters::get_chapter,
            commands::chapters::create_chapter,
            commands::chapters::save_chapter,
            // Config
            commands::config::get_providers,
            commands::config::save_providers,
            commands::config::get_agent_configs,
            commands::config::save_agent_configs,
            commands::config::update_agent_config,
            // Constraints
            commands::constraints::list_constraints,
            commands::constraints::get_constraint_file,
            commands::constraints::save_constraint_file,
            commands::constraints::create_constraint_file,
            commands::constraints::delete_constraint_file,
            // Reference
            commands::reference::list_references,
            commands::reference::get_reference_meta,
            commands::reference::save_reference_meta,
            commands::reference::upload_reference_file,
            commands::reference::delete_reference_file,
            // Pipeline
            commands::pipeline::get_pipeline_state,
            commands::pipeline::control_pipeline,
            commands::pipeline::get_all_pipelines,
            // LLM
            commands::llm::call_llm_bridge,
            commands::llm::scan_models,
            commands::llm::check_reasoning,
            // Naming
            commands::naming::generate_names,
            // Knowledge
            commands::knowledge::search_knowledge,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CoNovel");
}
