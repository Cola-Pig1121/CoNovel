"""Git operations for CoNovel book repositories using subprocess."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from app.config import GIT_AUTHOR_EMAIL, GIT_AUTHOR_NAME


def _run_git(args: list[str], cwd: Path, check: bool = True) -> subprocess.CompletedProcess:
    """Run a git command in the given directory."""
    env_extra = {
        "GIT_AUTHOR_NAME": GIT_AUTHOR_NAME,
        "GIT_AUTHOR_EMAIL": GIT_AUTHOR_EMAIL,
        "GIT_COMMITTER_NAME": GIT_AUTHOR_NAME,
        "GIT_COMMITTER_EMAIL": GIT_AUTHOR_EMAIL,
    }
    import os
    env = {**os.environ, **env_extra}
    return subprocess.run(
        ["git"] + args,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        check=check,
        env=env,
    )


def is_git_repo(path: Path) -> bool:
    """Check if a directory is a git repository."""
    try:
        result = _run_git(["rev-parse", "--git-dir"], cwd=path, check=True)
        return result.returncode == 0
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def init_book_repo(book_path: Path) -> bool:
    """Initialize a git repo for a book and create an initial commit."""
    try:
        _run_git(["init"], cwd=book_path)
        # Ensure .gitignore exists
        gitignore = book_path / ".gitignore"
        if not gitignore.exists():
            gitignore.write_text(
                "# CoNovel\n"
                "*.pyc\n"
                "__pycache__/\n"
                ".DS_Store\n"
                "node_modules/\n",
                encoding="utf-8",
            )
        _run_git(["add", "-A"], cwd=book_path)
        _run_git(
            ["commit", "-m", "Initial commit: book initialized"],
            cwd=book_path,
            check=False,  # OK if nothing to commit
        )
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def auto_commit(book_path: Path, message: str) -> bool:
    """Stage all changes and commit."""
    try:
        _run_git(["add", "-A"], cwd=book_path)
        result = _run_git(["diff", "--cached", "--quiet"], cwd=book_path, check=False)
        # If nothing staged, diff --cached --quiet returns 0
        if result.returncode == 0:
            return True  # Nothing to commit
        _run_git(["commit", "-m", message], cwd=book_path)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def create_branch(book_path: Path, branch_name: str) -> bool:
    """Create and switch to a new branch."""
    try:
        _run_git(["checkout", "-b", branch_name], cwd=book_path)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def get_log(book_path: Path, n: int = 20) -> list[dict]:
    """Get the last N commits as a list of dicts."""
    try:
        result = _run_git(
            ["log", f"-n{n}", "--format=%H|%s|%ai"],
            cwd=book_path,
            check=False,
        )
        if result.returncode != 0:
            return []
        logs = []
        for line in result.stdout.strip().split("\n"):
            if not line:
                continue
            parts = line.split("|", 2)
            if len(parts) >= 3:
                logs.append({
                    "hash": parts[0],
                    "message": parts[1],
                    "date": parts[2],
                })
        return logs
    except (subprocess.CalledProcessError, FileNotFoundError):
        return []


def export_template(book_path: Path, name: str, target_dir: Path) -> bool:
    """Export a book as a template: copy only knowledge files and .eve directory."""
    try:
        target = target_dir / name
        if target.exists():
            shutil.rmtree(target)
        target.mkdir(parents=True, exist_ok=True)

        # Copy knowledge directory if it exists
        knowledge_dir = book_path / "knowledge"
        if knowledge_dir.exists():
            shutil.copytree(knowledge_dir, target / "knowledge")

        # Copy .eve directory if it exists
        eve_dir = book_path / ".eve"
        if eve_dir.exists():
            shutil.copytree(eve_dir, target / ".eve")

        # Copy characters.json as template data
        chars_file = book_path / "characters.json"
        if chars_file.exists():
            shutil.copy2(chars_file, target / "characters.json")

        # Copy outline.json
        outline_file = book_path / "outline.json"
        if outline_file.exists():
            shutil.copy2(outline_file, target / "outline.json")

        # Copy world.json
        world_file = book_path / "world.json"
        if world_file.exists():
            shutil.copy2(world_file, target / "world.json")

        # Copy style.json
        style_file = book_path / "style.json"
        if style_file.exists():
            shutil.copy2(style_file, target / "style.json")

        # Init a git repo in the template for versioning
        init_book_repo(target)
        return True
    except (shutil.Error, OSError):
        return False


def import_from_github(repo_url: str, target_dir: Path) -> bool:
    """Clone a GitHub repository as a template."""
    try:
        if target_dir.exists():
            shutil.rmtree(target_dir)
        subprocess.run(
            ["git", "clone", "--depth=1", repo_url, str(target_dir)],
            capture_output=True,
            text=True,
            check=True,
        )
        # Remove .git to make it a clean template
        git_dir = target_dir / ".git"
        if git_dir.exists():
            shutil.rmtree(git_dir)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError, OSError):
        return False
