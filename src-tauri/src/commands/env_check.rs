use std::process::Command;
use serde::Serialize;

/// Check system environment on app startup
/// Returns status of Python, Node.js, pnpm, litellm, and git
#[tauri::command]
pub fn check_environment() -> Result<serde_json::Value, String> {
    let python = check_python();
    let node = check_node();
    let pnpm = check_pnpm();
    let litellm = check_litellm(&python);
    let git = check_git();

    let all_ok = python.installed && node.installed && pnpm.installed && litellm.installed && git.installed;

    Ok(serde_json::json!({
        "allReady": all_ok,
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
    let output = Command::new(&python)
        .args(["-m", "pip", "install", &dep, "--quiet"])
        .output()
        .map_err(|e| format!("Failed to run pip: {}", e))?;

    if output.status.success() {
        Ok(serde_json::json!({ "success": true, "message": format!("{} installed", dep) }))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("pip install failed: {}", stderr))
    }
}

#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    { Command::new("cmd").args(["/c", "start", &url]).output().map_err(|e| e.to_string())?; Ok(()) }
    #[cfg(target_os = "macos")]
    { Command::new("open").arg(&url).output().map_err(|e| e.to_string())?; Ok(()) }
    #[cfg(target_os = "linux")]
    { Command::new("xdg-open").arg(&url).output().map_err(|e| e.to_string())?; Ok(()) }
}

#[derive(Serialize)]
struct ToolStatus {
    installed: bool,
    version: String,
}

fn find_python() -> String {
    if cfg!(target_os = "windows") {
        if Command::new("python").arg("--version").output().is_ok() {
            return "python".to_string();
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
    let output = Command::new("node").arg("--version").output();
    match output {
        Ok(o) if o.status.success() => {
            let ver = String::from_utf8_lossy(&o.stdout).trim().to_string();
            ToolStatus { installed: true, version: ver }
        }
        _ => ToolStatus { installed: false, version: String::new() },
    }
}

fn check_pnpm() -> ToolStatus {
    let output = Command::new("pnpm").arg("--version").output();
    match output {
        Ok(o) if o.status.success() => {
            let ver = String::from_utf8_lossy(&o.stdout).trim().to_string();
            ToolStatus { installed: true, version: ver }
        }
        _ => ToolStatus { installed: false, version: String::new() },
    }
}

fn check_git() -> ToolStatus {
    let output = Command::new("git").arg("--version").output();
    match output {
        Ok(o) if o.status.success() => {
            let ver = String::from_utf8_lossy(&o.stdout).trim().to_string();
            ToolStatus { installed: true, version: ver }
        }
        _ => ToolStatus { installed: false, version: String::new() },
    }
}

fn check_litellm(python: &ToolStatus) -> ToolStatus {
    if !python.installed {
        return ToolStatus { installed: false, version: String::new() };
    }
    let cmd = find_python();
    let output = Command::new(&cmd)
        .args(["-c", "import litellm; print(litellm.__version__)"])
        .output();
    match output {
        Ok(o) if o.status.success() => {
            let ver = String::from_utf8_lossy(&o.stdout).trim().to_string();
            ToolStatus { installed: true, version: ver }
        }
        _ => ToolStatus { installed: false, version: String::new() },
    }
}
