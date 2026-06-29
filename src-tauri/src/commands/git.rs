use std::process::Command;
use std::path::PathBuf;

/// Git worktree operations for novel project version control
/// Each book gets its own git repo at ~/.config/conovel/books/{book-id}/

fn book_git_dir(book_id: &str) -> PathBuf {
    let home = dirs::home_dir().unwrap();
    home.join(".config").join("conovel").join("books").join(book_id)
}

/// Initialize a git repo for a book project
#[tauri::command]
pub fn git_init(book_id: String) -> Result<serde_json::Value, String> {
    let dir = book_git_dir(&book_id);

    // Initialize git repo if not exists
    let git_dir = dir.join(".git");
    if !git_dir.exists() {
        run_git(&dir, &["init"])?;
        run_git(&dir, &["config", "user.email", "conovel@local"])?;
        run_git(&dir, &["config", "user.name", "CoNovel"])?;

        // Create .gitignore
        let gitignore = "pipeline.json\n*.tmp\n*.log\n";
        std::fs::write(dir.join(".gitignore"), gitignore).ok();
    }

    // Initial commit
    run_git(&dir, &["add", "-A"])?;
    run_git(&dir, &["commit", "-m", "初始创建", "--allow-empty"])?;

    Ok(serde_json::json!({
        "success": true,
        "bookId": book_id,
        "message": "Git repo initialized"
    }))
}

/// Commit current state
#[tauri::command]
pub fn git_commit(book_id: String, message: String) -> Result<serde_json::Value, String> {
    let dir = book_git_dir(&book_id);
    if !dir.join(".git").exists() {
        git_init(book_id.clone())?;
    }

    run_git(&dir, &["add", "-A"])?;
    let output = run_git(&dir, &["commit", "-m", &message])?;

    Ok(serde_json::json!({
        "success": true,
        "message": output.trim()
    }))
}

/// Get commit log
#[tauri::command]
pub fn git_log(book_id: String, count: Option<u32>) -> Result<Vec<serde_json::Value>, String> {
    let dir = book_git_dir(&book_id);
    let n = count.unwrap_or(20);
    let output = run_git(&dir, &["log", &format!("-{}", n), "--pretty=format:%H|%s|%ai"])?;

    let commits: Vec<serde_json::Value> = output.lines()
        .filter(|line| !line.is_empty())
        .filter_map(|line| {
            let parts: Vec<&str> = line.splitn(3, '|').collect();
            if parts.len() >= 3 {
                Some(serde_json::json!({
                    "hash": parts[0],
                    "message": parts[1],
                    "date": parts[2],
                }))
            } else {
                None
            }
        })
        .collect();

    Ok(commits)
}

/// Restore to a specific commit (checkout)
#[tauri::command]
pub fn git_restore(book_id: String, commit_hash: String) -> Result<serde_json::Value, String> {
    let dir = book_git_dir(&book_id);

    // First commit current state
    run_git(&dir, &["add", "-A"])?;
    run_git(&dir, &["commit", "-m", &format!("Auto-save before restore to {}", &commit_hash[..8.min(commit_hash.len())])]).ok();

    // Checkout the target commit
    run_git(&dir, &["checkout", &commit_hash])?;

    // Create a new branch from this point
    let branch_name = format!("restore-{}", &commit_hash[..8.min(commit_hash.len())]);
    run_git(&dir, &["checkout", "-b", &branch_name])?;

    Ok(serde_json::json!({
        "success": true,
        "commitHash": commit_hash,
        "branch": branch_name,
        "message": format!("Restored to commit {}", &commit_hash[..8.min(commit_hash.len())])
    }))
}

/// Create a backup tag
#[tauri::command]
pub fn git_tag(book_id: String, tag_name: String) -> Result<serde_json::Value, String> {
    let dir = book_git_dir(&book_id);

    // Commit first
    run_git(&dir, &["add", "-A"])?;
    run_git(&dir, &["commit", "-m", &format!("Backup: {}", tag_name), "--allow-empty"]).ok();

    // Create tag
    run_git(&dir, &["tag", "-a", &tag_name, "-m", &format!("Backup tag: {}", tag_name)])?;

    Ok(serde_json::json!({
        "success": true,
        "tag": tag_name
    }))
}

/// List tags
#[tauri::command]
pub fn git_tags(book_id: String) -> Result<Vec<serde_json::Value>, String> {
    let dir = book_git_dir(&book_id);
    let output = run_git(&dir, &["tag", "-l", "--format=%(refname:short)|%(creatordate:short)"])?;

    let tags: Vec<serde_json::Value> = output.lines()
        .filter(|line| !line.is_empty())
        .filter_map(|line| {
            let parts: Vec<&str> = line.splitn(2, '|').collect();
            if parts.len() >= 2 {
                Some(serde_json::json!({
                    "name": parts[0],
                    "date": parts[1],
                }))
            } else if !parts[0].is_empty() {
                Some(serde_json::json!({ "name": parts[0], "date": "" }))
            } else {
                None
            }
        })
        .collect();

    Ok(tags)
}

/// Get diff summary
#[tauri::command]
pub fn git_diff(book_id: String) -> Result<String, String> {
    let dir = book_git_dir(&book_id);
    run_git(&dir, &["diff", "--stat"])
}

/// Get status
#[tauri::command]
pub fn git_status(book_id: String) -> Result<String, String> {
    let dir = book_git_dir(&book_id);
    run_git(&dir, &["status", "--short"])
}

fn run_git(dir: &PathBuf, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Git command failed: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() && !stderr.contains("nothing to commit") {
        // Some git commands "fail" but produce valid output
        if !stdout.is_empty() {
            return Ok(stdout);
        }
        return Err(format!("Git error: {}", stderr));
    }

    Ok(stdout)
}
