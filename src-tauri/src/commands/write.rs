use serde_json;

/// Start the writing pipeline for a chapter.
/// NOTE: The actual pipeline now runs client-side via TypeScript (lib/pipeline).
/// The frontend calls runPipeline() directly, which uses callLLM via Tauri IPC.
#[tauri::command]
pub fn start_pipeline(book_id: String, chapter_number: u32) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "success": true,
        "message": format!("Pipeline for book {} chapter {} should be started from the frontend", book_id, chapter_number),
    }))
}

/// Get the current pipeline status for a book.
#[tauri::command]
pub fn get_write_status(book_id: String) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "success": true,
        "canStart": true,
        "status": "idle",
        "bookId": book_id,
    }))
}
