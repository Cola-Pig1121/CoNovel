"""Import router — import local directories as CoNovel books."""

from __future__ import annotations

import json
import re
import shutil
from datetime import datetime
from pathlib import Path

import httpx
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
async def execute_import(req: ImportRequest):
    """Import a directory as a CoNovel book."""
    dir_path = Path(req.path)
    if not dir_path.exists():
        raise HTTPException(404, f"Directory not found: {req.path}")

    # Detect format
    detection = _detect_and_return(dir_path)

    if detection["format"] == "conovel":
        return _import_conovel(dir_path, req)
    elif detection["format"] in ("plain_text", "markdown"):
        return await _import_converted(dir_path, req, detection["format"])
    else:
        # Unknown format — try to import anyway using LLM
        return await _import_converted(dir_path, req, "unknown")


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

    # Create standard directory structure first
    _create_standard_dirs(book_dir)

    # Copy only CoNovel-relevant files (state.json, chapters/, .eve/, etc.)
    for item in dir_path.iterdir():
        if item.name.startswith('.') or item.name in ('__pycache__', 'node_modules', '.DS_Store'):
            continue
        # Only copy known CoNovel directories/files
        if item.name in ('chapters', 'memory', 'knowledge', 'references', 'events',
                         'constraints', 'characters', 'outline'):
            if item.is_dir():
                shutil.copytree(str(item), str(book_dir / item.name),
                              dirs_exist_ok=True,
                              ignore=shutil.ignore_patterns('.git', '__pycache__'))
            elif item.is_file():
                shutil.copy2(str(item), str(book_dir / item.name))
        elif item.name.endswith('.json') and item.name in ('state.json', 'characters.json',
                                                             'foreshadowing.json', 'timeline.json',
                                                             'outline.json'):
            shutil.copy2(str(item), str(book_dir / item.name))

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


STANDARD_DIRS = [
    "chapters",
    "memory/facts",
    "memory/summaries",
    "memory/character_states",
    "memory/long_term",
    "knowledge",
    "references",
    "events",
    "constraints",
]


def _create_standard_dirs(book_dir: Path) -> None:
    """Create the standard CoNovel book directory structure."""
    for d in STANDARD_DIRS:
        (book_dir / d).mkdir(parents=True, exist_ok=True)


def _import_converted(dir_path: Path, req: ImportRequest, fmt: str) -> dict:
    """Import and convert from any format using LLM, creating standardized CoNovel structure."""
    book_id = fm.generate_id()
    book_dir = fm.get_book_dir(book_id)
    book_dir.mkdir(parents=True, exist_ok=True)

    # 1. Create standard CoNovel directory structure
    _create_standard_dirs(book_dir)

    # 2. Create .eve template
    fm.create_book_eve_template(str(book_dir))

    # 3. Copy source files to references/ (not scattered in root)
    refs_dir = book_dir / "references"
    refs_dir.mkdir(exist_ok=True)
    for item in dir_path.iterdir():
        if item.name.startswith('.') or item.name in ('__pycache__', 'node_modules', '.DS_Store'):
            continue
        if item.is_dir():
            shutil.copytree(
                str(item), str(refs_dir / item.name),
                ignore=shutil.ignore_patterns('.git', '.eve', '__pycache__', 'node_modules'),
            )
        elif item.is_file():
            shutil.copy2(str(item), str(refs_dir / item.name))

    # 2. Create .eve template
    fm.create_book_eve_template(str(book_dir))

    # 3. Find ALL supported files recursively (any text-based file)
    all_files = _find_all_supported_files(dir_path)
    book_title = req.title or _guess_title(dir_path)

    # 4. Process files with LLM conversion
    chapters_dir = book_dir / "chapters"
    chapters_dir.mkdir(exist_ok=True)

    total_words = 0
    imported_count = 0
    chapter_index = 0

    if all_files:
        for f in all_files:
            content = _extract_text_from_file(f)
            if not content.strip():
                continue

            # Use LLM to analyze and convert content
            converted = await _convert_with_llm(content, f.name, book_title)
            chapters = converted.get("chapters", [])

            if not chapters:
                # Fallback: treat entire file as one chapter
                chapters = [{"title": _extract_chapter_title(f, content), "content": content}]

            for ch in chapters:
                chapter_index += 1
                ch_content = ch.get("content", "").strip()
                if not ch_content:
                    continue

                word_count = len(ch_content.split())
                total_words += word_count

                title = ch.get("title", f"第{chapter_index}章")

                chapter_data = {
                    "chapterNumber": chapter_index,
                    "title": title,
                    "content": ch_content,
                    "wordCount": word_count,
                    "status": "draft",
                    "outline": "",
                    "qualityGate": "L1",
                    "createdAt": datetime.now().isoformat(),
                    "updatedAt": datetime.now().isoformat(),
                }

                padded = f"chapter_{chapter_index:04d}"
                (chapters_dir / f"{padded}.json").write_text(
                    json.dumps(chapter_data, ensure_ascii=False, indent=2), "utf-8"
                )
                imported_count += 1
    else:
        # No files found — create an empty book
        pass

    # 5. Use LLM to extract metadata (title, genre, characters, outline)
    all_content = ""
    for f in all_files[:5]:  # Sample first 5 files for metadata
        content = _extract_text_from_file(f)
        all_content += content[:3000] + "\n\n"

    metadata = await _extract_metadata_with_llm(all_content, book_title)
    if metadata:
        # Update title if LLM found a better one
        if metadata.get("title") and len(metadata["title"]) > len(book_title):
            book_title = metadata["title"]
        # Use LLM-detected genre if user didn't specify
        if req.genre == "unknown" and metadata.get("genre"):
            req.genre = metadata["genre"]
        # Use LLM-detected premise if user didn't specify
        if not req.premise and metadata.get("premise"):
            req.premise = metadata["premise"]

    # 6. Create state.json with real data
    state = {
        "id": book_id,
        "title": book_title,
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

    # 7. Create characters.json from LLM-extracted data
    if metadata.get("characters"):
        characters = []
        for i, ch in enumerate(metadata["characters"]):
            characters.append({
                "id": f"char_{i+1}",
                "name": ch.get("name", f"角色{i+1}"),
                "role": ch.get("role", "supporting"),
                "personality": {"openness": 5, "conscientiousness": 5, "extraversion": 5, "agreeableness": 5, "neuroticism": 5},
                "voice": {"vocabulary": [], "sentencePattern": "mixed", "speechQuirks": [], "formality": "mixed"},
                "motivations": {"current": "", "longTerm": "", "fear": "", "desire": ""},
                "knowledgeBoundary": {"knows": [], "doesntKnow": [], "suspects": []},
                "relationships": {},
                "emotionalState": {"current": "平静", "intensity": 50, "triggers": []},
                "createdAt": datetime.now().isoformat(),
                "updatedAt": datetime.now().isoformat(),
            })
        (book_dir / "characters.json").write_text(
            json.dumps(characters, ensure_ascii=False, indent=2), "utf-8"
        )
    else:
        (book_dir / "characters.json").write_text("[]", "utf-8")

    # 8. Create outline.json from LLM-extracted data
    if metadata.get("outline"):
        outline = {
            "act_outlines": [],
            "chapter_outlines": [
                {"chapter_number": i+1, "title": ch.get("title", f"第{i+1}章"), "summary": "", "pov_character": "", "key_events": [], "characters_present": [], "foreshadowing_planted": [], "foreshadowing_resolved": []}
                for i, ch in enumerate([{"title": f"第{i+1}章"} for i in range(imported_count)])
            ],
        }
        (book_dir / "outline.json").write_text(
            json.dumps(outline, ensure_ascii=False, indent=2), "utf-8"
        )

    # 9. Create empty supporting files
    for fname in ["foreshadowing.json", "timeline.json"]:
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


# ── LLM Conversion Helpers ────────────────────────────────────────────────

# Supported file extensions for import
_TEXT_EXTENSIONS = {'.txt', '.md', '.markdown', '.rst', '.text'}
_HTML_EXTENSIONS = {'.html', '.htm'}
_DOCX_EXTENSIONS = {'.docx'}
_PDF_EXTENSIONS = {'.pdf'}
_ALL_SUPPORTED = _TEXT_EXTENSIONS | _HTML_EXTENSIONS | _DOCX_EXTENSIONS | _PDF_EXTENSIONS


def _find_all_supported_files(dir_path: Path) -> list[Path]:
    """Find all supported files recursively, excluding hidden directories."""
    files: list[Path] = []
    for ext_group in [_TEXT_EXTENSIONS, _HTML_EXTENSIONS, _DOCX_EXTENSIONS, _PDF_EXTENSIONS]:
        for ext in ext_group:
            for f in sorted(dir_path.rglob(f"*{ext}")):
                # Skip hidden directories
                if any(part.startswith('.') for part in f.relative_to(dir_path).parts[:-1]):
                    continue
                files.append(f)
    return files


def _extract_text_from_file(file_path: Path) -> str:
    """Extract text content from any supported file type."""
    suffix = file_path.suffix.lower()

    if suffix in _TEXT_EXTENSIONS:
        return file_path.read_text("utf-8", errors="replace")

    if suffix in _HTML_EXTENSIONS:
        return _extract_text_from_html(file_path)

    if suffix in _DOCX_EXTENSIONS:
        return _extract_text_from_docx(file_path)

    if suffix in _PDF_EXTENSIONS:
        return _extract_text_from_pdf(file_path)

    # Unknown extension — try reading as text
    try:
        return file_path.read_text("utf-8", errors="replace")
    except Exception:
        return ""


def _extract_text_from_html(file_path: Path) -> str:
    """Extract readable text from HTML files."""
    try:
        import html.parser

        class TextExtractor(html.parser.HTMLParser):
            def __init__(self):
                super().__init__()
                self._text: list[str] = []
                self._skip = False

            def handle_starttag(self, tag, attrs):
                if tag in ('script', 'style', 'noscript'):
                    self._skip = True

            def handle_endtag(self, tag):
                if tag in ('script', 'style', 'noscript'):
                    self._skip = False

            def handle_data(self, data):
                if not self._skip:
                    self._text.append(data)

            def get_text(self) -> str:
                return ' '.join(self._text)

        raw = file_path.read_text("utf-8", errors="replace")
        extractor = TextExtractor()
        extractor.feed(raw)
        return extractor.get_text()
    except Exception:
        return file_path.read_text("utf-8", errors="replace")


def _extract_text_from_docx(file_path: Path) -> str:
    """Extract text from .docx files using python-docx."""
    try:
        from docx import Document
        doc = Document(str(file_path))
        return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except ImportError:
        return "[需要安装 python-docx 来读取 .docx 文件]"
    except Exception as e:
        return f"[读取 .docx 文件失败: {e}]"


def _extract_text_from_pdf(file_path: Path) -> str:
    """Extract text from PDF files."""
    try:
        # Try PyMuPDF (fitz) first
        import fitz
        doc = fitz.open(str(file_path))
        texts = [page.get_text() for page in doc]
        doc.close()
        return "\n\n".join(texts)
    except ImportError:
        pass

    try:
        # Fallback to pdfminer
        from pdfminer.high_level import extract_text
        return extract_text(str(file_path))
    except ImportError:
        return "[需要安装 PyMuPDF 或 pdfminer 来读取 .pdf 文件]"
    except Exception as e:
        return f"[读取 .pdf 文件失败: {e}]"


async def _convert_with_llm(content: str, filename: str, book_title: str) -> dict:
    """Use LLM to analyze and convert content to CoNovel format."""
    # Get provider config
    providers = fm.read_providers()
    if not providers:
        return _simple_convert(content, filename)

    # Use the first enabled provider
    provider = next((p for p in providers if p.get("enabled", True)), None)
    if not provider:
        return _simple_convert(content, filename)

    # Call LLM
    api_url = provider.get("baseUrl", "https://api.openai.com/v1") + "/chat/completions"
    api_key = provider.get("apiKey", "")
    model = "gpt-4o-mini"
    if provider.get("models"):
        model = provider["models"][0].get("id", "gpt-4o-mini")

    prompt = f"""你是一个专业的网文编辑。请分析以下文本内容，将其转换为小说章节格式。

文件名: {filename}
书名: {book_title}

请完成以下任务：
1. 识别这是一个完整的章节还是多个章节
2. 如果是多个章节，按章节分割
3. 为每个章节提取标题
4. 返回 JSON 格式: {{"chapters": [{{"title": "章节标题", "content": "章节内容"}}]}}

注意：
- 只返回 JSON，不要包含其他文字
- 每个章节的 content 应该包含完整的章节文本
- 如果原文没有明显的章节分割，请根据内容的自然段落进行分割

原始内容（前2000字）:
{content[:2000]}"""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                api_url,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                },
            )
            resp.raise_for_status()
            result = resp.json()
            llm_content = result["choices"][0]["message"]["content"]

            # Parse JSON from LLM response (handle markdown code blocks)
            json_match = re.search(r'\{.*\}', llm_content, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                if "chapters" in parsed and isinstance(parsed["chapters"], list):
                    return parsed
    except Exception as e:
        print(f"LLM conversion failed: {e}")

    return _simple_convert(content, filename)


async def _extract_metadata_with_llm(all_content: str, book_title: str) -> dict:
    """Use LLM to extract metadata: title, genre, characters, outline from content."""
    providers = fm.read_providers()
    provider = next((p for p in (providers or []) if p.get("enabled", True)), None)
    if not provider:
        return {}

    api_url = provider.get("baseUrl", "https://api.openai.com/v1") + "/chat/completions"
    api_key = provider.get("apiKey", "")
    model = provider.get("models", [{}])[0].get("id", "gpt-4o-mini") if provider.get("models") else "gpt-4o-mini"

    prompt = f"""你是一个专业的网文编辑。请分析以下小说内容，提取元数据。

当前书名: {book_title}

请返回 JSON 格式（只返回 JSON，不要其他文字）:
{{
  "title": "更准确的书名（如果能判断的话）",
  "genre": "题材（xuanhuan/xianxia/wuxia/dushi/xuanyi/kehuan/yanqing/lishi/youxi）",
  "premise": "一句话故事前提",
  "characters": [
    {{"name": "角色名", "role": "protagonist/antagonist/supporting", "description": "简短描述"}}
  ],
  "outline": {{
    "summary": "整体故事线概述",
    "keyEvents": ["关键事件1", "关键事件2"]
  }}
}}

原始内容（前3000字）:
{all_content[:3000]}"""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                api_url,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.3},
            )
            resp.raise_for_status()
            result = resp.json()
            llm_content = result["choices"][0]["message"]["content"]
            json_match = re.search(r'\{.*\}', llm_content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
    except Exception as e:
        print(f"[Import] Metadata extraction failed: {e}")
    return {}


def _simple_convert(content: str, filename: str) -> dict:
    """Simple fallback: split by paragraphs when LLM is unavailable."""
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', content) if p.strip()]

    if not paragraphs:
        return {"chapters": []}

    chapters: list[dict] = []
    current_text = ""
    chapter_title = filename.rsplit('.', 1)[0]

    for para in paragraphs:
        if len(current_text) + len(para) > 2000 and current_text:
            chapters.append({"title": chapter_title, "content": current_text})
            chapter_title = f"第{len(chapters) + 1}章"
            current_text = para
        else:
            current_text = current_text + "\n\n" + para if current_text else para

    if current_text:
        chapters.append({"title": chapter_title, "content": current_text})

    return {"chapters": chapters}


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
