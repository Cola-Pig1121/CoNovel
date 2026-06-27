use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

fn config_dir() -> PathBuf {
    dirs::home_dir().unwrap().join(".config").join("conovel")
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Provider {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub api_format: String,
    pub api_key: String,
    pub models: Vec<ModelEntry>,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool { true }

#[derive(Serialize, Deserialize, Clone)]
pub struct ModelEntry {
    pub id: String,
    pub context_window: u32,
    #[serde(default)]
    pub supports_reasoning: bool,
    #[serde(default)]
    pub reasoning_levels: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AgentConfigEntry {
    pub role: String,
    pub name: String,
    #[serde(rename = "nameZh")]
    pub name_zh: String,
    #[serde(default)]
    pub provider: String,
    #[serde(default)]
    pub model_id: String,
    #[serde(default = "default_temp")]
    pub temperature: f64,
    #[serde(default = "default_tokens")]
    pub max_tokens: u32,
    #[serde(default = "default_context")]
    pub context_window: u32,
    #[serde(default)]
    pub reasoning_effort: Option<String>,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_temp() -> f64 { 0.7 }
fn default_tokens() -> u32 { 4096 }
fn default_context() -> u32 { 200000 }

fn ensure_config_dir() {
    let dir = config_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir).unwrap();
    }
}

#[tauri::command]
pub fn get_providers() -> Result<Vec<Provider>, String> {
    let f = config_dir().join("providers.json");
    if !f.exists() {
        return Ok(vec![]);
    }
    let data = fs::read_to_string(&f).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_providers(providers: Vec<Provider>) -> Result<(), String> {
    ensure_config_dir();
    let data = serde_json::to_string_pretty(&providers).unwrap();
    fs::write(config_dir().join("providers.json"), data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_agent_configs() -> Result<Vec<AgentConfigEntry>, String> {
    let f = config_dir().join("agents.json");
    if !f.exists() {
        return Ok(vec![]);
    }
    let data = fs::read_to_string(&f).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_agent_configs(configs: Vec<AgentConfigEntry>) -> Result<(), String> {
    ensure_config_dir();
    let data = serde_json::to_string_pretty(&configs).unwrap();
    fs::write(config_dir().join("agents.json"), data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_agent_config(role: String, updates: serde_json::Value) -> Result<AgentConfigEntry, String> {
    let mut configs = get_agent_configs()?;
    let idx = configs.iter().position(|c| c.role == role)
        .ok_or_else(|| format!("Agent not found: {}", role))?;

    // Merge updates
    let config_json = serde_json::to_value(&configs[idx]).unwrap();
    let mut merged = config_json;
    if let (Some(obj), Some(updates_obj)) = (merged.as_object_mut(), updates.as_object()) {
        for (key, value) in updates_obj {
            obj.insert(key.clone(), value.clone());
        }
    }

    configs[idx] = serde_json::from_value(merged).map_err(|e| e.to_string())?;
    save_agent_configs(configs.clone())?;

    Ok(configs[idx].clone())
}
