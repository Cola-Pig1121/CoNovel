"""Import router — import local directories as CoNovel books."""

from __future__ import annotations

import json
import re
import shutil
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app import file_manager as fm
from app.config import DATA_DIR
from app.git_manager import init_book_repo

router = APIRouter(prefix="/api/import", tags=["import"])


# ── Request / Response Models ──────────────────────────────────────────────

class DetectRequest(BaseModel):
    path: str  # Local directory path


class DetectResponse(BaseModel):
    format: str  # "conovel" | "plain_text" | "markdown" | "unknown"
    confidence: float  # 0-1
    description: str
    files: list[str]  # Key files found
    estimated_chapters: int
    has_metadata: bool
    has_git: bool


class ImportRequest(BaseModel):
    path: str
    title: str | None = None  # Override title (optional)
    genre: str = "unknown"
    premise: str = ""


# ── Format Detection ───────────────────────────────────────────────────────

@router.post("/detect")
def detect_format(req: DetectRequest):
    """Analyze a directory to determine its format."""
    dir_path = Path(req.path)
    if not dir_path.exists():
        raise HTTPException(404, f"Directory not found: {req.path}")
    if not dir_path.is_dir():
        raise HTTPException(400, "Path is not a directory")

    # Check for CoNovel format
    is_conovel = _check_conovel_format(dir_path)
    if is_conovel["score"] > 0.8:
        return DetectResponse(
            format="conovel",
            confidence=is_conovel["score"],
            description="CoNovel \u683c\u5f0f \u2014 \u53ef\u76f4\u63a5\u5bfc\u5165",
            files=is_conovel["files"],
            estimated_chapters=is_conovel["chapters"],
            has_metadata=is_conovel["has_metadata"],
            has_git=(dir_path / ".git").exists(),
        )

    # Check for plain text
    is_plain = _check_plain_text(dir_path)
    if is_plain["score"] > 0.6:
        return DetectResponse(
            format="plain_text",
            confidence=is_plain["score"],
            description=f"\u7eaf\u6587\u672c\u683c\u5f0f \u2014 \u5c06\u81ea\u52a8\u8f6c\u6362 ({is_plain['chapters']} \u4e2a\u6587\u4ef6)",
            files=is_plain["files"],
            estimated_chapters=is_plain["chapters"],
            has_metadata=False,
            has_git=False,
        )

    # Check for Markdown
    is_md = _check_markdown(dir_path)
    if is_md["score"] > 0.6:
        return DetectResponse(
            format="markdown",
            confidence=is_md["score"],
            description=f"Markdown \u683c\u5f0f \u2014 \u5c06\u81ea\u52a8\u8f6c\u6362 ({is_md['chapters']} \u4e2a\u6587\u4ef6)",
            files=is_md["files"],
            estimated_chapters=is_md["chapters"],
            has_metadata=False,
            has_git=False,
        )

    return DetectResponse(
        format="unknown",
        confidence=0.0,
        description="\u65e0\u6cd5\u8bc6\u522b\u7684\u683c\u5f0f",
        files=[],
        estimated_chapters=0,
        has_metadata=False,
        has_git=False,
    )


# ── Format Detection Helpers ───────────────────────────────────────────────

def _check_conovel_format(dir_path: Path) -> dict:
    """Check if directory is in CoNovel format."""
    score = 0.0
    files: list[str] = []
    chapters = 0
    has_metadata = False

    # Check state.json
    state_file = dir_path / "state.json"
    if state_file.exists():
        score += 0.4
        files.append("state.json")
        try:
            state = json.loads(state_file.read_text("utf-8"))
            if "title" in state and "genre" in state:
                score += 0.2
                has_metadata = True
        except Exception:
            pass

    # Check .eve directory
    if (dir_path / ".eve").exists():
        score += 0.2
        files.append(".eve/")

    # Check chapters directory
    chapters_dir = dir_path / "chapters"
    if chapters_dir.exists():
        chapter_files = list(chapters_dir.glob("chapter_*.json"))
        chapters = len(chapter_files)
        if chapters > 0:
            score += 0.2
            files.append(f"chapters/ ({chapters} files)")

    # Check characters
    if (dir_path / "characters.json").exists() or (dir_path / "characters").exists():
        score += 0.1
        files.append("characters")

    return {"score": min(score, 1.0), "files": files, "chapters": chapters, "has_metadata": has_metadata}


def _check_plain_text(dir_path: Path) -> dict:
    """Check for plain text novel files (recursively)."""
    txt_files = sorted(dir_path.rglob("*.txt"))
    if not txt_files:
        return {"score": 0, "files": [], "chapters": 0}

    # Check if filenames suggest chapters
    chapter_pattern = re.compile(r"(?:第|chapter|ch|第).*(?:章|节|回)", re.IGNORECASE)
    chapter_files = [f for f in txt_files if chapter_pattern.search(f.stem)]

    files = [str(f.relative_to(dir_path)) for f in txt_files[:10]]  # Show first 10
    chapters = len(chapter_files) if chapter_files else len(txt_files)

    # Score based on file count and naming
    score = min(0.3 + len(txt_files) * 0.05, 0.9)
    if chapter_files:
        score = min(score + 0.2, 0.95)

    return {"score": score, "files": files, "chapters": chapters}


def _check_markdown(dir_path: Path) -> dict:
    """Check for Markdown novel files (recursively)."""
    md_files = sorted(dir_path.rglob("*.md"))
    if not md_files:
        return {"score": 0, "files": [], "chapters": 0}

    files = [str(f.relative_to(dir_path)) for f in md_files[:10]]
    chapters = len(md_files)
    score = min(0.3 + len(md_files) * 0.05, 0.9)

    return {"score": score, "files": files, "chapters": chapters}


# ── Import Execution ───────────────────────────────────────────────────────

@router.post("/execute")
def execute_import(req: ImportRequest):
    """Import a directory as a CoNovel book."""
    dir_path = Path(req.path)
    if not dir_path.exists():
        raise HTTPException(404, f"Directory not found: {req.path}")

    # Detect format
    detection = _detect_and_return(dir_path)

    if detection["format"] == "conovel":
        return _import_conovel(dir_path, req)
    elif detection["format"] in ("plain_text", "markdown"):
        return _import_converted(dir_path, req, detection["format"])
    else:
        raise HTTPException(400, f"\u65e0\u6cd5\u8bc6\u522b\u7684\u683c\u5f0f: {detection['format']}")


def _detect_and_return(dir_path: Path) -> dict:
    """Internal format detection."""
    is_conovel = _check_conovel_format(dir_path)
    if is_conovel["score"] > 0.8:
        return {"format": "conovel", **is_conovel}
    is_plain = _check_plain_text(dir_path)
    if is_plain["score"] > 0.6:
        return {"format": "plain_text", **is_plain}
    is_md = _check_markdown(dir_path)
    if is_md["score"] > 0.6:
        return {"format": "markdown", **is_md}
    return {"format": "unknown", "score": 0}


# ── Import Functions ───────────────────────────────────────────────────────

def _import_conovel(dir_path: Path, req: ImportRequest) -> dict:
    """Import a CoNovel format directory directly."""
    book_id = fm.generate_id()
    book_dir = fm.get_book_dir(book_id)

    # Copy entire directory to books dir, skipping .git and other hidden dirs
    shutil.copytree(
        str(dir_path), str(book_dir),
        ignore=shutil.ignore_patterns('.git', '__pycache__', 'node_modules', '.DS_Store'),
    )

    # Update state.json with new ID and title if provided
    state_path = book_dir / "state.json"
    if state_path.exists():
        state = json.loads(state_path.read_text("utf-8"))
        state["id"] = book_id
        if req.title:
            state["title"] = req.title
        if req.genre and req.genre != "unknown":
            state["genre"] = req.genre
        state["updatedAt"] = datetime.now().isoformat()
        state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2), "utf-8")
    else:
        state = {}

    # Recalculate actual chapter count from files on disk
    chapters_dir = book_dir / "chapters"
    if chapters_dir.exists():
        actual_chapters = len(list(chapters_dir.glob("chapter_*.json")))
    else:
        actual_chapters = 0

    # Recalculate word count from actual chapter content
    total_words = 0
    if chapters_dir.exists():
        for cf in chapters_dir.glob("chapter_*.json"):
            try:
                ch_data = json.loads(cf.read_text("utf-8"))
                total_words += ch_data.get("wordCount", 0)
            except Exception:
                pass

    # Update state.json with recalculated counts
    state["currentChapter"] = actual_chapters
    state["totalChapters"] = actual_chapters
    state["currentWordCount"] = total_words
    state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2), "utf-8")

    # Update book index
    index = fm.read_book_index()
    meta = {
        "id": book_id,
        "title": state.get("title", req.title or dir_path.name),
        "genre": state.get("genre", req.genre),
        "genres": state.get("genres", []),
        "premise": state.get("premise", req.premise),
        "status": state.get("status", "planning"),
        "targetWordCount": state.get("targetWordCount", state.get("target_word_count", total_words * 3)),
        "currentWordCount": total_words,
        "currentChapter": actual_chapters,
        "totalChapters": actual_chapters,
        "createdAt": state.get("createdAt", state.get("created_at", datetime.now().isoformat())),
        "updatedAt": datetime.now().isoformat(),
    }
    index.append(meta)
    fm.write_book_index(index)

    # Init git if not already a repo
    if not (book_dir / ".git").exists():
        init_book_repo(book_dir)

    return {
        "imported": True,
        "bookId": book_id,
        "title": meta["title"],
        "format": "conovel",
        "chapters": actual_chapters,
        "totalWords": total_words,
    }


def _import_converted(dir_path: Path, req: ImportRequest, fmt: str) -> dict:
    """Import and convert from plain text or markdown, handling full directory structure."""
    book_id = fm.generate_id()
    book_dir = fm.get_book_dir(book_id)
    book_dir.mkdir(parents=True, exist_ok=True)

    # 1. Copy the ENTIRE source directory structure first
    #    This preserves any custom organization the user had
    for item in dir_path.iterdir():
        if item.name.startswith('.'):
            continue  # Skip hidden files/dirs
        if item.name in ('__pycache__', 'node_modules', '.DS_Store'):
            continue
        if item.is_dir():
            dest = book_dir / item.name
            shutil.copytree(
                str(item), str(dest),
                ignore=shutil.ignore_patterns('.git', '.eve', '__pycache__', 'node_modules', '.DS_Store'),
            )
        elif item.is_file():
            shutil.copy2(str(item), str(book_dir / item.name))

    # 2. Create .eve template
    fm.create_book_eve_template(str(book_dir))

    # 3. Find ALL text/markdown files recursively
    if fmt == "markdown":
        chapter_files = sorted(dir_path.rglob("*.md"))
    else:
        chapter_files = sorted(dir_path.rglob("*.txt"))

    # Filter out files inside hidden directories
    chapter_files = [
        f for f in chapter_files
        if not any(part.startswith('.') for part in f.relative_to(dir_path).parts[:-1])
    ]

    # Also try to handle single combined file case
    if not chapter_files:
        # Try reading all text files in root only
        all_text = []
        for f in sorted(dir_path.glob("*")):
            if f.is_file() and f.suffix in ('.txt', '.md'):
                all_text.append(f.read_text("utf-8", errors="replace"))
        if all_text:
            # Treat the directory root as a single chapter
            content = "\n\n".join(all_text)
            chapter_files = [dir_path]  # Placeholder — handled below

    # 4. Create chapters from source files
    chapters_dir = book_dir / "chapters"
    chapters_dir.mkdir(exist_ok=True)

    total_words = 0
    imported_count = 0

    if chapter_files and chapter_files[0] != dir_path:
        # Multiple chapter files found recursively
        for i, f in enumerate(chapter_files):
            if f.is_dir():
                continue
            content = f.read_text("utf-8", errors="replace")
            if not content.strip():
                continue

            word_count = len(content.split())
            total_words += word_count

            title = _extract_chapter_title(f, content)

            chapter_data = {
                "chapterNumber": i + 1,
                "title": title,
                "content": content,
                "wordCount": word_count,
                "status": "draft",
                "outline": "",
                "qualityGate": "L1",
                "createdAt": datetime.now().isoformat(),
                "updatedAt": datetime.now().isoformat(),
            }

            padded = f"chapter_{i + 1:04d}"
            (chapters_dir / f"{padded}.json").write_text(
                json.dumps(chapter_data, ensure_ascii=False, indent=2), "utf-8"
            )
            imported_count += 1
    elif chapter_files and chapter_files[0] == dir_path:
        # Single combined content from root-level text files
        word_count = len(content.split())
        total_words = word_count
        chapter_data = {
            "chapterNumber": 1,
            "title": _guess_title(dir_path),
            "content": content,
            "wordCount": word_count,
            "status": "draft",
            "outline": "",
            "qualityGate": "L1",
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
        }
        (chapters_dir / "chapter_0001.json").write_text(
            json.dumps(chapter_data, ensure_ascii=False, indent=2), "utf-8"
        )
        imported_count = 1

    # 5. Create state.json with real data
    state = {
        "id": book_id,
        "title": req.title or _guess_title(dir_path),
        "genre": req.genre,
        "genres": [req.genre] if req.genre != "unknown" else [],
        "premise": req.premise,
        "targetWordCount": max(total_words * 3, 100000),
        "currentWordCount": total_words,
        "currentChapter": imported_count,
        "totalChapters": imported_count,
        "status": "writing" if total_words > 0 else "planning",
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat(),
    }
    (book_dir / "state.json").write_text(
        json.dumps(state, ensure_ascii=False, indent=2), "utf-8"
    )

    # 6. Create empty supporting files (if not already present from copy)
    for fname in ["characters.json", "foreshadowing.json", "timeline.json"]:
        if not (book_dir / fname).exists():
            (book_dir / fname).write_text("[]", "utf-8")

    # 7. Update book index
    index = fm.read_book_index()
    meta = {
        "id": book_id,
        "title": state["title"],
        "genre": state["genre"],
        "genres": state.get("genres", []),
        "premise": state["premise"],
        "status": state["status"],
        "targetWordCount": state["targetWordCount"],
        "currentWordCount": total_words,
        "currentChapter": imported_count,
        "totalChapters": imported_count,
        "createdAt": state["createdAt"],
        "updatedAt": state["updatedAt"],
    }
    index.append(meta)
    fm.write_book_index(index)

    # 8. Init git
    init_book_repo(book_dir)

    return {
        "imported": True,
        "bookId": book_id,
        "title": state["title"],
        "format": fmt,
        "chapters": imported_count,
        "totalWords": total_words,
    }


# ── Utility Helpers ────────────────────────────────────────────────────────

def _guess_title(dir_path: Path) -> str:
    """Guess book title from directory name."""
    name = dir_path.name
    # Remove common prefixes like "novel_", "book_", numbers
    name = re.sub(r'^(?:novel|book|txt|text)[_\-\s]*', '', name, flags=re.IGNORECASE)
    name = re.sub(r'^\d+[\s._\-]*', '', name)
    return name.strip() or "未命名手稿"


def _read_all_text(dir_path: Path) -> str:
    """Read all text from a directory (concatenate files recursively)."""
    texts: list[str] = []
    for f in sorted(dir_path.rglob("*.txt")) + sorted(dir_path.rglob("*.md")):
        # Skip hidden directories
        if any(part.startswith('.') for part in f.relative_to(dir_path).parts[:-1]):
            continue
        texts.append(f.read_text("utf-8", errors="replace"))
    return "\n\n".join(texts)


def _extract_chapter_title(file_path: Path, content: str) -> str:
    """Try to extract chapter title from filename or first line."""
    # Try filename patterns: "第1章_xxx", "Chapter 1_xxx", "001_xxx"
    patterns = [
        re.compile(r"\u7b2c(\d+)[\u7ae0\u56de\u8282]\s*[_\-\s]*(.*)"),
        re.compile(r"[Cc]hapter\s*(\d+)[\s:_]*(.*)"),
        re.compile(r"^(\d+)[\s._]+(.*)"),
    ]
    for p in patterns:
        m = p.match(file_path.stem)
        if m:
            return m.group(2).strip() or f"\u7b2c{m.group(1)}\u7ae0"

    # Try first line of content
    first_line = content.split("\n")[0].strip()
    if len(first_line) < 50 and first_line:
        return first_line.lstrip("#").strip()

    return file_path.stem
