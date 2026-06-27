use std::fs;
use std::path::PathBuf;

fn config_dir() -> PathBuf {
    dirs::home_dir().unwrap().join(".config").join("conovel")
}

fn constraints_dir(book_id: &str) -> PathBuf {
    let dir = config_dir().join("books").join(book_id).join("constraints");
    if !dir.exists() {
        fs::create_dir_all(&dir).unwrap();
    }
    dir
}

fn default_constraints() -> Vec<(String, String)> {
    vec![
        ("style-constraints.md".into(), "# 风格约束\n\n## 叙事视角\n第三人称有限视角\n\n## 句式风格\n长短交替，避免连续长句。\n\n## 禁词列表\n不禁、仿佛、映入眼帘、微微、淡淡、缓缓\n".into()),
        ("banned-words.md".into(), "# 禁词列表\n\n## AI高频词汇\n不禁、仿佛、映入眼帘、前所未有、意义深远\n微微、淡淡、缓缓、默默\n\n## AI句式\n不是A而是B、不仅...而且...更、首先其次最后\n值得注意的是、不可否认、毋庸置疑\n".into()),
        ("plot-constraints.md".into(), "# 剧情约束\n\n## 剧情加速上限\n每章最多触发以下之一：A:主线推进 / B:关系升级 / C:秘密揭示\n\n## 节奏控制\n高潮后安排缓冲，连续高潮不超过3章\n\n## 章末钩子\n每章至少1个章末钩子\n".into()),
        ("character-rules.md".into(), "# 角色行为规则\n\n角色行为必须符合性格设定。角色能力不能超出已建立的水平。\n".into()),
        ("writing-guide.md".into(), "# 写作指南\n\n## 自由编写区域\n在这里编写创作约束和灵感笔记。\n".into()),
    ]
}

#[tauri::command]
pub fn list_constraints(book_id: String) -> Result<Vec<serde_json::Value>, String> {
    let dir = constraints_dir(&book_id);

    // Initialize defaults if empty
    let existing: Vec<String> = fs::read_dir(&dir)
        .map(|d| d.filter_map(|e| e.ok()).filter(|e| e.path().extension().map_or(false, |ext| ext == "md")).map(|e| e.file_name().to_string_lossy().to_string()).collect())
        .unwrap_or_default();

    if existing.is_empty() {
        for (name, content) in default_constraints() {
            fs::write(dir.join(&name), content).unwrap();
        }
    }

    let files: Vec<serde_json::Value> = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map_or(false, |ext| ext == "md"))
        .map(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            let content = fs::read_to_string(e.path()).unwrap_or_default();
            serde_json::json!({
                "name": name,
                "size": content.len(),
                "preview": content.chars().take(100).collect::<String>(),
            })
        })
        .collect();

    Ok(files)
}

#[tauri::command]
pub fn get_constraint_file(book_id: String, name: String) -> Result<String, String> {
    let dir = constraints_dir(&book_id);
    let f = dir.join(&name);
    if !f.exists() {
        return Err("File not found".to_string());
    }
    fs::read_to_string(&f).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_constraint_file(book_id: String, name: String, content: String) -> Result<(), String> {
    let dir = constraints_dir(&book_id);
    // Sanitize filename
    let safe_name: String = name.chars().filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-').collect();
    if !safe_name.ends_with(".md") {
        return Err("File must end with .md".to_string());
    }
    fs::write(dir.join(&safe_name), content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_constraint_file(book_id: String, name: String, content: Option<String>) -> Result<(), String> {
    let dir = constraints_dir(&book_id);
    let safe_name: String = name.chars().filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-').collect();
    let file_name = if safe_name.ends_with(".md") { safe_name } else { format!("{}.md", safe_name) };
    let f = dir.join(&file_name);
    if f.exists() {
        return Err("File already exists".to_string());
    }
    fs::write(&f, content.unwrap_or_else(|| format!("# {}\n\n（在此编写约束内容）\n", name))).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_constraint_file(book_id: String, name: String) -> Result<(), String> {
    let dir = constraints_dir(&book_id);
    let f = dir.join(&name);
    if f.exists() {
        fs::remove_file(&f).map_err(|e| e.to_string())?;
    }
    Ok(())
}
