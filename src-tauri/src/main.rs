#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use std::process::Command;

fn main() {
    // ===== Environment check before window opens =====
    let env_status = check_environment_before_launch();

    // ===== Launch Tauri =====
    // With output: 'export', Next.js generates static HTML in out/
    // Tauri bundles these files into the exe - no server needed
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(env_status)
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
            // Write
            commands::write::start_pipeline,
            commands::write::get_write_status,
            // Git
            commands::git::git_init,
            commands::git::git_commit,
            commands::git::git_log,
            commands::git::git_restore,
            commands::git::git_tag,
            commands::git::git_tags,
            commands::git::git_diff,
            commands::git::git_status,
            // Store
            commands::store::export_template,
            commands::store::import_template,
            commands::store::list_templates,
            commands::store::clone_template,
            commands::store::delete_template,
            commands::store::push_template,
            // Environment Check
            commands::env_check::check_environment,
            commands::env_check::install_python_dep,
            commands::env_check::open_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CoNovel");
}

/// Check environment before launching the window.
fn check_environment_before_launch() -> serde_json::Value {
    let python = check_tool("python", &["--version"]);
    let node = check_tool("node", &["--version"]);
    let pnpm = check_tool("pnpm", &["--version"]);
    let git = check_tool("git", &["--version"]);
    let litellm = check_litellm();

    let all_ready = python.0 && node.0 && litellm.0 && git.0;

    if !all_ready {
        eprintln!("=== CoNovel Environment Check ===");
        if !python.0 { eprintln!("  [X] Python  - NOT FOUND"); }
        else { eprintln!("  [v] Python  - {}", python.1); }
        if !node.0 { eprintln!("  [X] Node.js - NOT FOUND"); }
        else { eprintln!("  [v] Node.js - {}", node.1); }
        if !pnpm.0 { eprintln!("  [ ] pnpm    - not found (optional)"); }
        else { eprintln!("  [v] pnpm    - {}", pnpm.1); }
        if !litellm.0 { eprintln!("  [X] litellm - NOT FOUND (pip install litellm)"); }
        else { eprintln!("  [v] litellm - {}", litellm.1); }
        if !git.0 { eprintln!("  [X] Git     - NOT FOUND"); }
        else { eprintln!("  [v] Git     - {}", git.1); }
        eprintln!("================================");
    }

    serde_json::json!({
        "allReady": all_ready,
        "python": { "installed": python.0, "version": python.1 },
        "node": { "installed": node.0, "version": node.1 },
        "pnpm": { "installed": pnpm.0, "version": pnpm.1 },
        "litellm": { "installed": litellm.0, "version": litellm.1 },
        "git": { "installed": git.0, "version": git.1 },
    })
}

fn check_tool(name: &str, args: &[&str]) -> (bool, String) {
    match Command::new(name).args(args).output() {
        Ok(o) if o.status.success() => (true, String::from_utf8_lossy(&o.stdout).trim().to_string()),
        _ => (false, String::new()),
    }
}

fn check_litellm() -> (bool, String) {
    let py = if cfg!(target_os = "windows") { "python" } else { "python3" };
    match Command::new(py).args(["-c", "import litellm; print(litellm.__version__)"]).output() {
        Ok(o) if o.status.success() => (true, String::from_utf8_lossy(&o.stdout).trim().to_string()),
        _ => (false, String::new()),
    }
}
