use std::fs;
use std::path::PathBuf;

fn knowledge_dir() -> PathBuf {
    // Knowledge CSVs are in the core package
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..").join("packages").join("core").join("src").join("knowledge")
}

#[tauri::command]
pub fn search_knowledge(query: Option<String>, category: Option<String>, genre: Option<String>) -> Result<serde_json::Value, String> {
    let dir = knowledge_dir();
    if !dir.exists() {
        return Ok(serde_json::json!({ "entries": [], "total": 0, "categories": [] }));
    }

    let mut all_entries = Vec::new();
    let mut categories = std::collections::HashSet::new();

    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().map_or(false, |ext| ext == "csv") {
            let file_name = path.file_stem().unwrap().to_string_lossy().to_string();
            let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            let entries = parse_csv(&content);

            for mut e in entries {
                // Filter by category
                if let Some(ref cat) = category {
                    if e.get("category").map(|s| s.as_str()) != Some(cat.as_str()) {
                        continue;
                    }
                }
                // Filter by genre
                if let Some(ref g) = genre {
                    let genres_str = e.get("applicable_genres").or(e.get("applicableGenres")).map(|s| s.as_str()).unwrap_or("");
                    let genres: Vec<&str> = genres_str.split('|').collect();
                    if !genres.contains(&g.as_str()) && !genres.contains(&"all") {
                        continue;
                    }
                }
                // Filter by query
                if let Some(ref q) = query {
                    let lower = q.to_lowercase();
                    let matches = e.values().any(|v| v.to_lowercase().contains(&lower));
                    if !matches { continue; }
                }

                if let Some(cat) = e.get("category") {
                    categories.insert(cat.clone());
                }
                e.insert("_file".to_string(), file_name.clone());
                all_entries.push(e);
            }
        }
    }

    Ok(serde_json::json!({
        "entries": all_entries,
        "total": all_entries.len(),
        "categories": categories.into_iter().collect::<Vec<_>>(),
    }))
}

fn parse_csv(content: &str) -> Vec<std::collections::HashMap<String, String>> {
    let lines: Vec<&str> = content.trim().split('\n').collect();
    if lines.len() < 2 { return vec![]; }

    let headers: Vec<String> = lines[0].split(',').map(|h| h.trim().to_string()).collect();
    let mut entries = Vec::new();

    for line in &lines[1..] {
        let values = parse_csv_line(line);
        if values.len() >= 3 {
            let mut entry = std::collections::HashMap::new();
            for (i, header) in headers.iter().enumerate() {
                if i < values.len() {
                    entry.insert(header.clone(), values[i].clone());
                }
            }
            entries.push(entry);
        }
    }
    entries
}

fn parse_csv_line(line: &str) -> Vec<String> {
    let mut result = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;

    for ch in line.chars() {
        match ch {
            '"' => in_quotes = !in_quotes,
            ',' if !in_quotes => {
                result.push(current.trim().to_string());
                current = String::new();
            }
            _ => current.push(ch),
        }
    }
    result.push(current.trim().to_string());
    result
}
