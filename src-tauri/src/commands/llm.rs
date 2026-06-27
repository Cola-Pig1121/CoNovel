use std::process::Command;

#[tauri::command]
pub fn call_llm_bridge(action: String, input: String) -> Result<serde_json::Value, String> {
    // Find the Python script
    let script_paths = vec![
        "scripts/llm_bridge.py",
        "../scripts/llm_bridge.py",
        "../../scripts/llm_bridge.py",
    ];

    let script_path = script_paths.iter()
        .find(|p| std::path::Path::new(p).exists())
        .map(|p| p.to_string())
        .unwrap_or_else(|| "scripts/llm_bridge.py".to_string());

    let output = Command::new(if cfg!(target_os = "windows") { "python" } else { "python3" })
        .arg(&script_path)
        .arg("--action")
        .arg(&action)
        .arg("--input")
        .arg(&input)
        .env("PYTHONIOENCODING", "utf-8")
        .output()
        .map_err(|e| format!("Failed to execute Python: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() {
        return Err(format!("Python error: {}", stderr));
    }

    serde_json::from_str(&stdout).map_err(|e| format!("Failed to parse response: {} (stdout: {})", e, stdout))
}

#[tauri::command]
pub fn scan_models(provider: String, api_key: Option<String>, base_url: Option<String>) -> Result<serde_json::Value, String> {
    let input = serde_json::json!({
        "provider": provider,
        "api_key": api_key.unwrap_or_default(),
        "base_url": base_url.unwrap_or_default(),
    });
    call_llm_bridge("scan_models".to_string(), input.to_string())
}

#[tauri::command]
pub fn check_reasoning(model_id: String) -> Result<serde_json::Value, String> {
    let input = serde_json::json!({ "model": model_id });
    call_llm_bridge("check_reasoning".to_string(), input.to_string())
}
