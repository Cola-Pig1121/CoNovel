use std::fs;
use std::path::PathBuf;

fn config_dir() -> PathBuf {
    dirs::home_dir().unwrap().join(".config").join("conovel")
}

fn ref_dir(book_id: &str) -> PathBuf {
    let dir = config_dir().join("books").join(book_id).join("reference");
    if !dir.exists() { fs::create_dir_all(&dir).unwrap(); }
    dir
}

#[tauri::command]
pub fn list_references(book_id: String) -> Result<serde_json::Value, String> {
    let dir = ref_dir(&book_id);
    let files: Vec<serde_json::Value> = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            (name.ends_with(".txt") || name.ends_with(".md")) && !name.starts_with('_')
        })
        .map(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            let size = fs::metadata(e.path()).map(|m| m.len()).unwrap_or(0);
            serde_json::json!({ "name": name, "size": size })
        })
        .collect();

    let meta_file = dir.join("_meta.json");
    let meta: serde_json::Value = if meta_file.exists() {
        fs::read_to_string(&meta_file).ok().and_then(|d| serde_json::from_str(&d).ok()).unwrap_or_default()
    } else {
        serde_json::json!({ "books": [], "techniques": [], "customNotes": "" })
    };

    Ok(serde_json::json!({ "files": files, "meta": meta }))
}

#[tauri::command]
pub fn get_reference_meta(book_id: String) -> Result<serde_json::Value, String> {
    let dir = ref_dir(&book_id);
    let meta_file = dir.join("_meta.json");
    if meta_file.exists() {
        let data = fs::read_to_string(&meta_file).map_err(|e| e.to_string())?;
        serde_json::from_str(&data).map_err(|e| e.to_string())
    } else {
        Ok(serde_json::json!({ "books": [], "techniques": [], "customNotes": "" }))
    }
}

#[tauri::command]
pub fn save_reference_meta(book_id: String, meta: serde_json::Value) -> Result<(), String> {
    let dir = ref_dir(&book_id);
    let data = serde_json::to_string_pretty(&meta).unwrap();
    fs::write(dir.join("_meta.json"), data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn upload_reference_file(book_id: String, file_name: String, file_content: Vec<u8>) -> Result<serde_json::Value, String> {
    let dir = ref_dir(&book_id);
    // Sanitize filename
    let safe_name: String = file_name.chars().filter(|c| !matches!(c, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*')).collect();
    if safe_name.is_empty() {
        return Err("Invalid filename".to_string());
    }
    let size = file_content.len() as u64;
    fs::write(dir.join(&safe_name), file_content).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true, "name": safe_name, "size": size }))
}

#[tauri::command]
pub fn delete_reference_file(book_id: String, file_name: String) -> Result<(), String> {
    let dir = ref_dir(&book_id);
    let f = dir.join(&file_name);
    if f.exists() {
        fs::remove_file(&f).map_err(|e| e.to_string())?;
    }
    Ok(())
}
