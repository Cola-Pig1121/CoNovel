use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

fn config_dir() -> PathBuf {
    dirs::home_dir().unwrap().join(".config").join("conovel")
}

fn pipeline_file(book_id: &str) -> PathBuf {
    config_dir().join("books").join(book_id).join("pipeline.json")
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PipelineState {
    pub book_id: String,
    pub chapter_number: u32,
    #[serde(default = "default_idle")]
    pub status: String,
    #[serde(default)]
    pub current_stage: String,
    #[serde(default)]
    pub breakpoint_at: String,
    #[serde(default)]
    pub breakpoint_reason: String,
    #[serde(default)]
    pub token_usage: TokenUsage,
    #[serde(default)]
    pub history: Vec<PipelineEvent>,
    pub created_at: String,
    pub updated_at: String,
}

fn default_idle() -> String { "idle".to_string() }

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct TokenUsage {
    #[serde(default)]
    pub total_prompt: u64,
    #[serde(default)]
    pub total_completion: u64,
    #[serde(default)]
    pub total_tokens: u64,
    #[serde(default)]
    pub per_agent: std::collections::HashMap<String, AgentTokens>,
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct AgentTokens {
    #[serde(default)]
    pub prompt: u64,
    #[serde(default)]
    pub completion: u64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PipelineEvent {
    pub stage: String,
    #[serde(default)]
    pub agent: String,
    pub action: String,
    pub timestamp: String,
    #[serde(default)]
    pub duration: Option<u64>,
}

fn chrono_now() -> String {
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs();
    format!("{}-{:02}-{:02}T{:02}:{:02}:{:02}Z", 1970 + (now / 31536000) as u32, ((now % 31536000) / 2592000) % 12 + 1, ((now % 2592000) / 86400) + 1, (now % 86400) / 3600, (now % 3600) / 60, now % 60)
}

#[tauri::command]
pub fn get_pipeline_state(book_id: String) -> Result<serde_json::Value, String> {
    let f = pipeline_file(&book_id);
    if !f.exists() {
        return Ok(serde_json::json!({
            "status": "idle",
            "token_usage": { "total_tokens": 0, "per_agent": {} },
            "history": [],
        }));
    }
    let data = fs::read_to_string(&f).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn control_pipeline(
    book_id: String,
    action: String,
    stage: Option<String>,
    reason: Option<String>,
    next_stage: Option<String>,
    agent: Option<String>,
    chapter_number: Option<u32>,
) -> Result<serde_json::Value, String> {
    let f = pipeline_file(&book_id);
    let now = chrono_now();

    let mut state: serde_json::Value = if f.exists() {
        serde_json::from_str(&fs::read_to_string(&f).map_err(|e| e.to_string())?).unwrap_or_default()
    } else {
        serde_json::json!({
            "book_id": book_id,
            "chapter_number": 0,
            "status": "idle",
            "current_stage": "",
            "breakpoint_at": "",
            "breakpoint_reason": "",
            "token_usage": { "total_prompt": 0, "total_completion": 0, "total_tokens": 0, "per_agent": {} },
            "history": [],
            "created_at": now,
            "updated_at": now,
        })
    };

    match action.as_str() {
        "start" => {
            state["status"] = serde_json::json!("running");
            if let Some(ch) = chapter_number { state["chapter_number"] = serde_json::json!(ch); }
            state["current_stage"] = serde_json::json!("context_assembly");
            let hist = state["history"].as_array_mut().unwrap();
            hist.push(serde_json::json!({"stage": "context_assembly", "agent": "", "action": "start", "timestamp": now}));
        }
        "breakpoint" => {
            state["status"] = serde_json::json!("breakpoint");
            if let Some(s) = stage { state["breakpoint_at"] = serde_json::json!(s); }
            if let Some(r) = reason { state["breakpoint_reason"] = serde_json::json!(r); }
        }
        "resume" => {
            state["status"] = serde_json::json!("running");
            state["breakpoint_at"] = serde_json::json!("");
            state["breakpoint_reason"] = serde_json::json!("");
        }
        "advance" => {
            if let Some(ns) = next_stage { state["current_stage"] = serde_json::json!(ns); }
            let stage_clone = state["current_stage"].clone();
            let agent_clone = serde_json::json!(agent.unwrap_or_default());
            state["history"].as_array_mut().unwrap().push(serde_json::json!({"stage": stage_clone, "agent": agent_clone, "action": "complete", "timestamp": now}));
        }
        "complete" => {
            state["status"] = serde_json::json!("completed");
        }
        "reset" => {
            state["status"] = serde_json::json!("idle");
            state["current_stage"] = serde_json::json!("");
        }
        _ => {}
    }

    state["updated_at"] = serde_json::json!(now.clone());
    let bd = config_dir().join("books").join(&book_id);
    if !bd.exists() { fs::create_dir_all(&bd).unwrap(); }
    fs::write(&f, serde_json::to_string_pretty(&state).unwrap()).map_err(|e| e.to_string())?;

    Ok(state)
}

#[tauri::command]
pub fn get_all_pipelines() -> Result<Vec<serde_json::Value>, String> {
    let books_dir = config_dir().join("books");
    if !books_dir.exists() { return Ok(vec![]); }

    let mut result = Vec::new();
    let dirs: Vec<_> = fs::read_dir(&books_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .collect();

    for dir in dirs {
        let book_id = dir.file_name().to_string_lossy().to_string();
        let pf = dir.path().join("pipeline.json");
        if pf.exists() {
            if let Ok(data) = fs::read_to_string(&pf) {
                if let Ok(state) = serde_json::from_str::<serde_json::Value>(&data) {
                    if state["status"] == "running" || state["status"] == "breakpoint" {
                        // Get book title from state.json
                        let state_file = dir.path().join("state.json");
                        let title = if state_file.exists() {
                            fs::read_to_string(&state_file)
                                .ok()
                                .and_then(|d| serde_json::from_str::<serde_json::Value>(&d).ok())
                                .and_then(|s| s["title"].as_str().unwrap_or("Unknown").to_string().into())
                                .unwrap_or_else(|| book_id.clone())
                        } else {
                            book_id.clone()
                        };
                        result.push(serde_json::json!({
                            "bookId": book_id,
                            "bookTitle": title,
                            "currentChapter": state["chapter_number"],
                            "pipelineStage": state["current_stage"],
                            "pipelineProgress": get_progress(state["current_stage"].as_str().unwrap_or("")),
                        }));
                    }
                }
            }
        }
    }

    Ok(result)
}

fn get_progress(stage: &str) -> u32 {
    match stage {
        "context_assembled" => 10,
        "character_intelligence" => 20,
        "writing" => 35,
        "drafted" => 50,
        "reviewing" => 65,
        "editing" => 75,
        "de_ai" => 85,
        "completed" => 100,
        _ => 0,
    }
}
