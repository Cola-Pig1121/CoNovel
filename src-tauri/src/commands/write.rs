use std::process::Command;

#[tauri::command]
pub fn start_pipeline(book_id: String, chapter_number: u32) -> Result<serde_json::Value, String> {
    // Call the Node.js API route via the running Next.js dev server
    let base_url = "http://localhost:3002";
    let url = format!("{}/api/books/{}/write", base_url, book_id);

    let input = serde_json::json!({
        "chapterNumber": chapter_number,
        "action": "start",
    });

    let output = Command::new("curl")
        .args([
            "-s", "-X", "POST",
            &url,
            "-H", "Content-Type: application/json",
            "-d", &input.to_string(),
            "--max-time", "600",
        ])
        .output()
        .map_err(|e| format!("Failed to call write API: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    serde_json::from_str(&stdout).map_err(|e| format!("Failed to parse response: {} (stdout: {})", e, stdout))
}

#[tauri::command]
pub fn get_write_status(book_id: String) -> Result<serde_json::Value, String> {
    let base_url = "http://localhost:3002";
    let url = format!("{}/api/books/{}/write", base_url, book_id);

    let output = Command::new("curl")
        .args(["-s", &url, "--max-time", "10"])
        .output()
        .map_err(|e| format!("Failed to call write API: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    serde_json::from_str(&stdout).map_err(|e| format!("Failed to parse response: {}", e))
}
