use std::fs;
use std::path::PathBuf;
use std::process::Command;

/// Template Store - export/import project configs as templates
/// Templates are stored as directories that can be uploaded to GitHub
/// or cloned from a template repository

fn config_dir() -> PathBuf {
    dirs::home_dir().unwrap().join(".config").join("conovel")
}

fn store_dir() -> PathBuf {
    let dir = config_dir().join("store");
    if !dir.exists() {
        fs::create_dir_all(&dir).unwrap();
    }
    dir
}

fn templates_dir() -> PathBuf {
    let dir = store_dir().join("templates");
    if !dir.exists() {
        fs::create_dir_all(&dir).unwrap();
    }
    dir
}

/// Export a book's config as a template
#[tauri::command]
pub fn export_template(book_id: String, template_name: String, description: String) -> Result<serde_json::Value, String> {
    let book_dir = config_dir().join("books").join(&book_id);
    let tmpl_dir = templates_dir().join(&template_name);

    if !book_dir.exists() {
        return Err("Book not found".to_string());
    }

    if !tmpl_dir.exists() {
        fs::create_dir_all(&tmpl_dir).map_err(|e| e.to_string())?;
    }

    // Copy config files (not chapters, not pipeline state)
    let files_to_copy = ["style.json", "constraints/", "reference/"];
    for file in &files_to_copy {
        let src = book_dir.join(file);
        let dst = tmpl_dir.join(file);
        if src.exists() {
            if src.is_dir() {
                copy_dir_recursive(&src, &dst).ok();
            } else {
                fs::create_dir_all(dst.parent().unwrap()).ok();
                fs::copy(&src, &dst).ok();
            }
        }
    }

    // Save template metadata
    let meta = serde_json::json!({
        "name": template_name,
        "description": description,
        "bookId": book_id,
        "createdAt": chrono_now(),
        "version": "1.0.0",
    });
    fs::write(tmpl_dir.join("template.json"), serde_json::to_string_pretty(&meta).unwrap()).ok();

    // Initialize git in template dir for version control
    let git_dir = tmpl_dir.join(".git");
    if !git_dir.exists() {
        Command::new("git").args(["init"]).current_dir(&tmpl_dir).output().ok();
        Command::new("git").args(["config", "user.email", "conovel@local"]).current_dir(&tmpl_dir).output().ok();
        Command::new("git").args(["config", "user.name", "CoNovel"]).current_dir(&tmpl_dir).output().ok();
    }
    Command::new("git").args(["add", "-A"]).current_dir(&tmpl_dir).output().ok();
    Command::new("git").args(["commit", "-m", &format!("Export template: {}", template_name)]).current_dir(&tmpl_dir).output().ok();

    Ok(serde_json::json!({
        "success": true,
        "templateName": template_name,
        "path": tmpl_dir.to_string_lossy(),
    }))
}

/// Import a template into a new book
#[tauri::command]
pub fn import_template(template_name: String, new_book_id: String, new_book_title: String) -> Result<serde_json::Value, String> {
    let tmpl_dir = templates_dir().join(&template_name);
    let book_dir = config_dir().join("books").join(&new_book_id);

    if !tmpl_dir.exists() {
        return Err(format!("Template '{}' not found", template_name));
    }

    if !book_dir.exists() {
        fs::create_dir_all(&book_dir).map_err(|e| e.to_string())?;
    }

    // Copy template files to book directory
    let files_to_import = ["style.json", "constraints/", "reference/"];
    for file in &files_to_import {
        let src = tmpl_dir.join(file);
        let dst = book_dir.join(file);
        if src.exists() {
            if src.is_dir() {
                copy_dir_recursive(&src, &dst).ok();
            } else {
                fs::create_dir_all(dst.parent().unwrap()).ok();
                fs::copy(&src, &dst).ok();
            }
        }
    }

    Ok(serde_json::json!({
        "success": true,
        "templateName": template_name,
        "bookId": new_book_id,
        "message": format!("Template '{}' imported to book '{}'", template_name, new_book_title),
    }))
}

/// List available templates (local)
#[tauri::command]
pub fn list_templates() -> Result<Vec<serde_json::Value>, String> {
    let dir = templates_dir();
    if !dir.exists() {
        return Ok(vec![]);
    }

    let mut templates = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.path().is_dir() {
            let name = entry.file_name().to_string_lossy().to_string();
            let meta_file = entry.path().join("template.json");
            let meta: serde_json::Value = if meta_file.exists() {
                fs::read_to_string(&meta_file)
                    .ok()
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or(serde_json::json!({ "name": name }))
            } else {
                serde_json::json!({ "name": name })
            };
            templates.push(meta);
        }
    }

    Ok(templates)
}

/// Clone a template from a GitHub repository
#[tauri::command]
pub fn clone_template(params: serde_json::Value) -> Result<serde_json::Value, String> {
    let repo_url = params.get("repo_url").or_else(|| params.get("repoUrl"))
        .and_then(|v| v.as_str()).unwrap_or("").to_string();
    let template_name = params.get("template_name").or_else(|| params.get("templateName"))
        .and_then(|v| v.as_str()).map(|s| s.to_string());

    if repo_url.is_empty() {
        return Err("repo_url is required".to_string());
    }

    let tmpl_name = template_name.unwrap_or_else(|| {
        repo_url.split('/').last().unwrap_or("template").replace(".git", "")
    });

    let target_dir = templates_dir().join(&tmpl_name);
    if target_dir.exists() {
        // Pull latest
        let output = Command::new("git")
            .args(["pull"])
            .current_dir(&target_dir)
            .output()
            .map_err(|e| e.to_string())?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        return Ok(serde_json::json!({
            "success": true,
            "templateName": tmpl_name,
            "message": format!("Updated: {}", stdout.trim()),
        }));
    }

    // Clone
    let output = Command::new("git")
        .args(["clone", &repo_url, &target_dir.to_string_lossy()])
        .output()
        .map_err(|e| format!("Git clone failed: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("Clone failed: {}", stderr));
    }

    Ok(serde_json::json!({
        "success": true,
        "templateName": tmpl_name,
        "message": format!("Cloned from {}", repo_url),
    }))
}

/// Delete a template
#[tauri::command]
pub fn delete_template(template_name: String) -> Result<(), String> {
    let dir = templates_dir().join(&template_name);
    if dir.exists() {
        fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Push template to GitHub
#[tauri::command]
pub fn push_template(params: serde_json::Value) -> Result<serde_json::Value, String> {
    let template_name = params.get("template_name").or_else(|| params.get("templateName"))
        .and_then(|v| v.as_str()).unwrap_or("").to_string();
    let repo_url = params.get("repo_url").or_else(|| params.get("repoUrl"))
        .and_then(|v| v.as_str()).unwrap_or("").to_string();

    let dir = templates_dir().join(&template_name);
    if !dir.exists() {
        return Err("Template not found".to_string());
    }

    // Add remote if not exists
    let remote_check = Command::new("git")
        .args(["remote", "get-url", "origin"])
        .current_dir(&dir)
        .output();

    if remote_check.is_err() || !remote_check.unwrap().status.success() {
        Command::new("git")
            .args(["remote", "add", "origin", &repo_url])
            .current_dir(&dir)
            .output()
            .map_err(|e| e.to_string())?;
    }

    // Push
    let output = Command::new("git")
        .args(["push", "-u", "origin", "main", "--force"])
        .current_dir(&dir)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() {
        return Err(format!("Push failed: {}", stderr));
    }

    Ok(serde_json::json!({
        "success": true,
        "repoUrl": repo_url,
        "message": stdout.trim(),
    }))
}

fn copy_dir_recursive(src: &PathBuf, dst: &PathBuf) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn chrono_now() -> String {
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs();
    format!("{}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        1970 + (now / 31536000) as u32,
        ((now % 31536000) / 2592000) % 12 + 1,
        ((now % 2592000) / 86400) + 1,
        (now % 86400) / 3600,
        (now % 3600) / 60,
        now % 60,
    )
}
