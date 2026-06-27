use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

fn config_dir() -> PathBuf {
    dirs::home_dir().unwrap().join(".config").join("conovel")
}

fn chapters_dir(book_id: &str) -> PathBuf {
    config_dir().join("books").join(book_id).join("chapters")
}

fn chapter_file(book_id: &str, chapter_number: u32) -> PathBuf {
    chapters_dir(book_id).join(format!("{:04}.json", chapter_number))
}

#[derive(Serialize, Deserialize)]
pub struct ChapterMeta {
    pub chapter_number: u32,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub word_count: u32,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub content: String,
    #[serde(default)]
    pub outline: String,
    #[serde(default)]
    pub agent_outputs: serde_json::Value,
    #[serde(default)]
    pub quality_gate: serde_json::Value,
    #[serde(default)]
    pub word_target: u32,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

fn ensure_chapters_dir(book_id: &str) {
    let dir = chapters_dir(book_id);
    if !dir.exists() {
        fs::create_dir_all(&dir).unwrap();
    }
}

fn count_words(text: &str) -> u32 {
    let chinese = text.chars().filter(|c| '\u{4e00}' <= *c && *c <= '\u{9fff}').count();
    let english = text.split_whitespace().filter(|w| w.bytes().all(|b| b.is_ascii_alphabetic())).count();
    (chinese + english) as u32
}

fn strip_markdown(text: &str) -> String {
    let mut result = text.to_string();
    // Remove headings
    result = regex_replace(r"^#{1,6}\s+", &result, "");
    // Remove bold/italic
    result = regex_replace(r"\*\*(.+?)\*\*", &result, "$1");
    result = regex_replace(r"\*(.+?)\*", &result, "$1");
    // Remove links
    result = regex_replace(r"\[(.+?)\]\(.+?\)", &result, "$1");
    // Remove code blocks
    result = regex_replace(r"```[\s\S]*?```", &result, "");
    result = regex_replace(r"`(.+?)`", &result, "$1");
    // Remove blockquotes
    result = regex_replace(r"^>\s+", &result, "");
    // Remove list markers
    result = regex_replace(r"^[-*+]\s+", &result, "");
    result = regex_replace(r"^\d+\.\s+", &result, "");
    result
}

fn regex_replace(pattern: &str, text: &str, replacement: &str) -> String {
    // Simple regex replacement without regex crate
    // For now, just return the original text
    // TODO: Add regex crate for proper markdown stripping
    text.to_string()
}

#[tauri::command]
pub fn list_chapters(book_id: String) -> Result<Vec<ChapterMeta>, String> {
    let dir = chapters_dir(&book_id);
    if !dir.exists() {
        return Ok(vec![]);
    }

    let mut chapters: Vec<ChapterMeta> = Vec::new();
    let mut entries: Vec<_> = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map_or(false, |ext| ext == "json"))
        .collect();

    entries.sort_by_key(|e| e.file_name());

    for entry in entries {
        if let Ok(data) = fs::read_to_string(entry.path()) {
            if let Ok(chapter) = serde_json::from_str::<ChapterMeta>(&data) {
                chapters.push(chapter);
            }
        }
    }

    Ok(chapters)
}

#[tauri::command]
pub fn get_chapter(book_id: String, chapter_number: u32) -> Result<serde_json::Value, String> {
    let f = chapter_file(&book_id, chapter_number);
    if !f.exists() {
        return Err("Chapter not found".to_string());
    }
    let data = fs::read_to_string(&f).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_chapter(
    book_id: String,
    chapter_number: u32,
    title: String,
    content: String,
    outline: String,
) -> Result<serde_json::Value, String> {
    ensure_chapters_dir(&book_id);

    let now = chrono_now();
    let word_count = count_words(&content);

    let chapter = serde_json::json!({
        "id": uuid::Uuid::new_v4().to_string(),
        "bookId": book_id.clone(),
        "chapterNumber": chapter_number,
        "title": if title.is_empty() { format!("第{}章", chapter_number) } else { title },
        "content": content,
        "wordCount": word_count,
        "status": "draft",
        "outline": outline,
        "agentOutputs": {},
        "qualityGate": { "l1": false, "l2": false, "l3": false, "l4": false, "l5": false },
        "wordTarget": 3000,
        "createdAt": now.clone(),
        "updatedAt": now,
    });

    let file = chapter_file(&book_id, chapter_number);
    fs::write(&file, serde_json::to_string_pretty(&chapter).unwrap()).map_err(|e| e.to_string())?;

    // Update book total chapters
    let book_file = config_dir().join("books").join(&book_id).join("state.json");
    if book_file.exists() {
        let data = fs::read_to_string(&book_file).unwrap_or_default();
        let mut state: serde_json::Value = serde_json::from_str(&data).unwrap_or_default();
        let dir = chapters_dir(&book_id);
        let count = fs::read_dir(&dir)
            .map(|d| d.filter_map(|e| e.ok()).filter(|e| e.path().extension().map_or(false, |ext| ext == "json")).count())
            .unwrap_or(0);
        state["totalChapters"] = serde_json::json!(count);
        state["updatedAt"] = serde_json::json!(chrono_now());
        fs::write(&book_file, serde_json::to_string_pretty(&state).unwrap()).unwrap();
    }

    Ok(chapter)
}

#[tauri::command]
pub fn save_chapter(book_id: String, chapter_number: u32, content: String, status: Option<String>) -> Result<serde_json::Value, String> {
    let f = chapter_file(&book_id, chapter_number);
    if !f.exists() {
        return Err("Chapter not found".to_string());
    }

    let data = fs::read_to_string(&f).map_err(|e| e.to_string())?;
    let mut chapter: serde_json::Value = serde_json::from_str(&data).map_err(|e| e.to_string())?;

    // Strip markdown
    let clean_content = strip_markdown(&content);
    let word_count = count_words(&clean_content);

    chapter["content"] = serde_json::json!(clean_content);
    chapter["wordCount"] = serde_json::json!(word_count);
    if let Some(s) = status {
        chapter["status"] = serde_json::json!(s);
    }
    chapter["updatedAt"] = serde_json::json!(chrono_now());

    let json = serde_json::to_string_pretty(&chapter).unwrap();
    fs::write(&f, json).map_err(|e| e.to_string())?;

    // Update book word count
    let book_file = config_dir().join("books").join(&book_id).join("state.json");
    if book_file.exists() {
        let data = fs::read_to_string(&book_file).unwrap_or_default();
        let mut state: serde_json::Value = serde_json::from_str(&data).unwrap_or_default();
        state["updatedAt"] = serde_json::json!(chrono_now());
        fs::write(&book_file, serde_json::to_string_pretty(&state).unwrap()).unwrap();
    }

    Ok(chapter)
}

fn chrono_now() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    format!("{}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        1970 + (now / 31536000) as u32,
        ((now % 31536000) / 2592000) % 12 + 1,
        ((now % 2592000) / 86400) + 1,
        (now % 86400) / 3600,
        (now % 3600) / 60,
        now % 60,
    )
}
