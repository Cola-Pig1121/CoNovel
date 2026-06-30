use std::process::Command;
use serde::Serialize;

#[derive(Serialize)]
struct ToolStatus {
    installed: bool,
    version: String,
}

/// Check environment — pnpm/node are optional for runtime, only python+litellm required
#[tauri::command]
pub fn check_environment() -> Result<serde_json::Value, String> {
    let python = check_python();
    let node = check_node();
    let pnpm = check_pnpm();
    let litellm = check_litellm(&python);
    let git = check_git();

    // Only python + litellm are required for the app to work
    let all_ready = python.installed && litellm.installed;

    Ok(serde_json::json!({
        "allReady": all_ready,
        "python": python,
        "node": node,
        "pnpm": pnpm,
        "litellm": litellm,
        "git": git,
    }))
}

#[tauri::command]
pub fn install_python_dep(dep: String) -> Result<serde_json::Value, String> {
    let python = find_python();

    // Spawn pip install in background (non-blocking)
    // Using spawn() instead of output() so the UI doesn't freeze
    let _child = Command::new(&python)
        .args(["-m", "pip", "install", &dep])
        .spawn()
        .map_err(|e| format!("Failed to start pip: {}", e))?;

    // Return immediately - user should re-check status after install completes
    Ok(serde_json::json!({
        "success": true,
        "message": format!("{} installation started in background. Click 're-check' after a moment.", dep),
    }))
}

#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    { let _ = Command::new("cmd").args(["/c", "start", &url]).output(); Ok(()) }
    #[cfg(target_os = "macos")]
    { let _ = Command::new("open").arg(&url).output(); Ok(()) }
    #[cfg(target_os = "linux")]
    { let _ = Command::new("xdg-open").arg(&url).output(); Ok(()) }
}

// ===== Helpers =====

fn find_python() -> String {
    // Try python first (Windows), then python3 (Unix)
    for cmd in &["python", "python3"] {
        if Command::new(cmd).arg("--version").output().map(|o| o.status.success()).unwrap_or(false) {
            return cmd.to_string();
        }
    }
    "python3".to_string()
}

fn check_python() -> ToolStatus {
    let cmd = find_python();
    let output = Command::new(&cmd).arg("--version").output();
    match output {
        Ok(o) if o.status.success() => {
            let ver = String::from_utf8_lossy(&o.stdout).trim().to_string();
            ToolStatus { installed: true, version: ver }
        }
        _ => ToolStatus { installed: false, version: String::new() },
    }
}

fn check_node() -> ToolStatus {
    match Command::new("node").arg("--version").output() {
        Ok(o) if o.status.success() => ToolStatus { installed: true, version: String::from_utf8_lossy(&o.stdout).trim().to_string() },
        _ => ToolStatus { installed: false, version: String::new() },
    }
}

fn check_pnpm() -> ToolStatus {
    // Try direct
    if let Ok(o) = Command::new("pnpm").arg("--version").output() {
        if o.status.success() {
            return ToolStatus { installed: true, version: String::from_utf8_lossy(&o.stdout).trim().to_string() };
        }
    }
    // Try npx pnpm (works when pnpm is installed via npm but not in PATH)
    if let Ok(o) = Command::new("npx").args(["pnpm", "--version"]).output() {
        if o.status.success() {
            return ToolStatus { installed: true, version: String::from_utf8_lossy(&o.stdout).trim().to_string() };
        }
    }
    // Try npm pnpm (works when installed globally via npm)
    if let Ok(o) = Command::new("npm").args(["exec", "pnpm", "--", "--version"]).output() {
        if o.status.success() {
            return ToolStatus { installed: true, version: String::from_utf8_lossy(&o.stdout).trim().to_string() };
        }
    }
    ToolStatus { installed: false, version: String::new() }
}

fn check_litellm(python: &ToolStatus) -> ToolStatus {
    if !python.installed { return ToolStatus { installed: false, version: String::new() }; }
    let ver = verify_litellm(&find_python());
    if !ver.is_empty() {
        ToolStatus { installed: true, version: ver }
    } else {
        ToolStatus { installed: false, version: String::new() }
    }
}

fn verify_litellm(python_cmd: &str) -> String {
    match Command::new(python_cmd).args(["-c", "import litellm; print(litellm.__version__)"]).output() {
        Ok(o) if o.status.success() => String::from_utf8_lossy(&o.stdout).trim().to_string(),
        _ => String::new(),
    }
}

fn check_git() -> ToolStatus {
    match Command::new("git").arg("--version").output() {
        Ok(o) if o.status.success() => ToolStatus { installed: true, version: String::from_utf8_lossy(&o.stdout).trim().to_string() },
        _ => ToolStatus { installed: false, version: String::new() },
    }
}
