#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use std::process::{Command, Child};
use std::sync::Mutex;
use std::time::Duration;

static NEXTJS_CHILD: Mutex<Option<Child>> = Mutex::new(None);

fn main() {
    // ===== 1. Environment check =====
    let env_status = check_environment_before_launch();

    // ===== 2. Start Next.js server (production mode) =====
    if !is_dev_mode() {
        start_nextjs_server();
        // Wait for server to be ready
        wait_for_server("http://localhost:3002", 30);
    }

    // ===== 3. Launch Tauri =====
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(env_status)
        .invoke_handler(tauri::generate_handler![
            commands::books::list_books,
            commands::books::get_book,
            commands::books::create_book,
            commands::books::update_book,
            commands::books::delete_book,
            commands::chapters::list_chapters,
            commands::chapters::get_chapter,
            commands::chapters::create_chapter,
            commands::chapters::save_chapter,
            commands::config::get_providers,
            commands::config::save_providers,
            commands::config::get_agent_configs,
            commands::config::save_agent_configs,
            commands::config::update_agent_config,
            commands::constraints::list_constraints,
            commands::constraints::get_constraint_file,
            commands::constraints::save_constraint_file,
            commands::constraints::create_constraint_file,
            commands::constraints::delete_constraint_file,
            commands::reference::list_references,
            commands::reference::get_reference_meta,
            commands::reference::save_reference_meta,
            commands::reference::upload_reference_file,
            commands::reference::delete_reference_file,
            commands::pipeline::get_pipeline_state,
            commands::pipeline::control_pipeline,
            commands::pipeline::get_all_pipelines,
            commands::llm::call_llm_bridge,
            commands::llm::scan_models,
            commands::llm::check_reasoning,
            commands::naming::generate_names,
            commands::knowledge::search_knowledge,
            commands::write::start_pipeline,
            commands::write::get_write_status,
            commands::git::git_init,
            commands::git::git_commit,
            commands::git::git_log,
            commands::git::git_restore,
            commands::git::git_tag,
            commands::git::git_tags,
            commands::git::git_diff,
            commands::git::git_status,
            commands::store::export_template,
            commands::store::import_template,
            commands::store::list_templates,
            commands::store::clone_template,
            commands::store::delete_template,
            commands::store::push_template,
            commands::env_check::check_environment,
            commands::env_check::install_python_dep,
            commands::env_check::open_url,
        ])
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // Kill Next.js server when window closes
                if let Ok(mut child) = NEXTJS_CHILD.lock() {
                    if let Some(ref mut c) = *child {
                        let _ = c.kill();
                    }
                    *child = None;
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running CoNovel");
}

/// Check if running in dev mode (via cargo tauri dev)
fn is_dev_mode() -> bool {
    cfg!(debug_assertions)
}

/// Start Next.js production server as background process
fn start_nextjs_server() {
    // Find the packages/studio directory relative to the exe
    let exe_dir = std::env::current_exe().ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_default();

    // Try multiple paths to find the Next.js project
    let candidates = [
        exe_dir.join("../../../packages/studio"),
        exe_dir.join("../../packages/studio"),
        exe_dir.join("packages/studio"),
    ];

    let studio_dir = candidates.iter()
        .find(|p| p.join("package.json").exists())
        .cloned();

    if let Some(dir) = studio_dir {
        eprintln!("[CoNovel] Starting Next.js server from: {}", dir.display());
        let child = Command::new("node")
            .args([
                &dir.join("node_modules/.bin/next").to_string_lossy(),
                "start",
                "-p", "3002",
            ])
            .current_dir(&dir)
            .spawn();

        match child {
            Ok(c) => {
                *NEXTJS_CHILD.lock().unwrap() = Some(c);
                eprintln!("[CoNovel] Next.js server started on port 3002");
            }
            Err(e) => {
                eprintln!("[CoNovel] Failed to start Next.js: {}", e);
                // Try with npx
                let child2 = Command::new("npx")
                    .args(["next", "start", "-p", "3002"])
                    .current_dir(&dir)
                    .spawn();
                if let Ok(c) = child2 {
                    *NEXTJS_CHILD.lock().unwrap() = Some(c);
                }
            }
        }
    } else {
        eprintln!("[CoNovel] Could not find packages/studio directory");
    }
}

/// Poll until server is ready or timeout
fn wait_for_server(url: &str, timeout_secs: u64) {
    for _ in 0..timeout_secs * 2 {
        if let Ok(resp) = reqwest::blocking::get(url) {
            if resp.status().is_success() {
                eprintln!("[CoNovel] Server ready at {}", url);
                return;
            }
        }
        std::thread::sleep(Duration::from_millis(500));
    }
    eprintln!("[CoNovel] Server may not be ready, proceeding anyway");
}

fn check_environment_before_launch() -> serde_json::Value {
    let python = check_tool("python", &["--version"]);
    let node = check_tool("node", &["--version"]);
    let pnpm = check_tool("pnpm", &["--version"]);
    let git = check_tool("git", &["--version"]);
    let litellm = check_litellm();
    let all_ready = python.0 && node.0 && litellm.0 && git.0;

    if !all_ready {
        eprintln!("=== CoNovel Environment Check ===");
        if !python.0 { eprintln!("  [X] Python  - NOT FOUND"); } else { eprintln!("  [v] Python  - {}", python.1); }
        if !node.0 { eprintln!("  [X] Node.js - NOT FOUND"); } else { eprintln!("  [v] Node.js - {}", node.1); }
        if !pnpm.0 { eprintln!("  [ ] pnpm    - not found (optional)"); } else { eprintln!("  [v] pnpm    - {}", pnpm.1); }
        if !litellm.0 { eprintln!("  [X] litellm - NOT FOUND (pip install litellm)"); } else { eprintln!("  [v] litellm - {}", litellm.1); }
        if !git.0 { eprintln!("  [X] Git     - NOT FOUND"); } else { eprintln!("  [v] Git     - {}", git.1); }
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
