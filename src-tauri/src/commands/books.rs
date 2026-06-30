use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

fn config_dir() -> PathBuf {
    dirs::home_dir().unwrap().join(".config").join("conovel")
}

fn books_dir() -> PathBuf {
    config_dir().join("books")
}

fn index_file() -> PathBuf {
    books_dir().join("_index.json")
}

fn book_dir(book_id: &str) -> PathBuf {
    books_dir().join(book_id)
}

fn book_state_file(book_id: &str) -> PathBuf {
    book_dir(book_id).join("state.json")
}

#[derive(Serialize, Deserialize, Clone)]
pub struct BookMeta {
    pub id: String,
    pub title: String,
    pub genre: String,
    #[serde(default)]
    pub genres: Vec<String>,
    #[serde(default)]
    pub premise: String,
    #[serde(default)]
    pub target_word_count: u64,
    #[serde(default)]
    pub current_word_count: u64,
    #[serde(default)]
    pub current_chapter: u32,
    #[serde(default)]
    pub total_chapters: u32,
    #[serde(default = "default_status")]
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

fn default_status() -> String {
    "planning".to_string()
}

#[derive(Serialize, Deserialize, Clone)]
pub struct BookState {
    pub id: String,
    pub title: String,
    pub genre: String,
    #[serde(default)]
    pub genres: Vec<String>,
    #[serde(default)]
    pub premise: String,
    #[serde(default)]
    pub target_word_count: u64,
    #[serde(default)]
    pub current_word_count: u64,
    #[serde(default)]
    pub current_chapter: u32,
    #[serde(default)]
    pub total_chapters: u32,
    #[serde(default = "default_status")]
    pub status: String,
    #[serde(default)]
    pub characters: Vec<serde_json::Value>,
    #[serde(default)]
    pub foreshadowing: Vec<serde_json::Value>,
    #[serde(default)]
    pub outline: serde_json::Value,
    #[serde(default)]
    pub timeline: Vec<serde_json::Value>,
    #[serde(default)]
    pub world_settings: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
    pub last_synced_at: String,
}

fn ensure_dirs() {
    let bd = books_dir();
    if !bd.exists() {
        fs::create_dir_all(&bd).unwrap();
    }
}

fn read_index() -> Vec<BookMeta> {
    let f = index_file();
    if !f.exists() {
        return vec![];
    }
    let data = fs::read_to_string(&f).unwrap_or_default();
    serde_json::from_str(&data).unwrap_or_default()
}

fn write_index(books: &[BookMeta]) {
    ensure_dirs();
    let data = serde_json::to_string_pretty(books).unwrap();
    fs::write(index_file(), data).unwrap();
}

#[tauri::command]
pub fn list_books() -> Result<serde_json::Value, String> {
    let books = read_index();
    Ok(serde_json::json!({ "books": books }))
}

#[tauri::command]
pub fn get_book(book_id: String) -> Result<serde_json::Value, String> {
    let f = book_state_file(&book_id);
    if !f.exists() {
        return Err("Book not found".to_string());
    }
    let data = fs::read_to_string(&f).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_book(
    title: String,
    genre: String,
    genres: Vec<String>,
    premise: String,
    target_word_count: u64,
) -> Result<BookState, String> {
    ensure_dirs();

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono_now();

    let state = BookState {
        id: id.clone(),
        title: title.clone(),
        genre: genre.clone(),
        genres: genres.clone(),
        premise: premise.clone(),
        target_word_count,
        current_word_count: 0,
        current_chapter: 0,
        total_chapters: 0,
        status: "planning".to_string(),
        characters: vec![],
        foreshadowing: vec![],
        outline: serde_json::json!({ "volumes": [], "progress": { "mainPlot": 0, "subplots": {} } }),
        timeline: vec![],
        world_settings: serde_json::json!({}),
        created_at: now.clone(),
        updated_at: now.clone(),
        last_synced_at: now.clone(),
    };

    // Create book directory and save state
    let bd = book_dir(&id);
    fs::create_dir_all(&bd).map_err(|e| e.to_string())?;
    let state_json = serde_json::to_string_pretty(&state).unwrap();
    fs::write(book_state_file(&id), state_json).map_err(|e| e.to_string())?;

    // Update index
    let mut index = read_index();
    index.push(BookMeta {
        id: id.clone(),
        title,
        genre,
        genres,
        premise,
        target_word_count,
        current_word_count: 0,
        current_chapter: 0,
        total_chapters: 0,
        status: "planning".to_string(),
        created_at: now.clone(),
        updated_at: now,
    });
    write_index(&index);

    Ok(state)
}

#[tauri::command]
pub fn update_book(book_id: String, updates: serde_json::Value) -> Result<serde_json::Value, String> {
    let f = book_state_file(&book_id);
    if !f.exists() {
        return Err("Book not found".to_string());
    }

    let data = fs::read_to_string(&f).map_err(|e| e.to_string())?;
    let mut state: serde_json::Value = serde_json::from_str(&data).map_err(|e| e.to_string())?;

    // Merge updates
    if let (Some(obj), Some(updates_obj)) = (state.as_object_mut(), updates.as_object()) {
        for (key, value) in updates_obj {
            obj.insert(key.clone(), value.clone());
        }
    }

    state["updated_at"] = serde_json::json!(chrono_now());
    let json = serde_json::to_string_pretty(&state).unwrap();
    fs::write(f, json).map_err(|e| e.to_string())?;

    // Update index
    let mut index = read_index();
    if let Some(book) = index.iter_mut().find(|b| b.id == book_id) {
        if let Some(title) = updates.get("title").and_then(|v| v.as_str()) {
            book.title = title.to_string();
        }
        if let Some(genre) = updates.get("genre").and_then(|v| v.as_str()) {
            book.genre = genre.to_string();
        }
        book.updated_at = chrono_now();
    }
    write_index(&index);

    Ok(state)
}

#[tauri::command]
pub fn delete_book(book_id: String) -> Result<(), String> {
    let bd = book_dir(&book_id);
    if bd.exists() {
        fs::remove_dir_all(&bd).map_err(|e| e.to_string())?;
    }

    let mut index = read_index();
    index.retain(|b| b.id != book_id);
    write_index(&index);

    Ok(())
}

fn chrono_now() -> String {
    // Simple timestamp without chrono dependency
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
