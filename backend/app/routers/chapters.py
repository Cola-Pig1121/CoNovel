"""Chapters router — read, list, and update chapter content."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app import file_manager as fm
from app.agent_lifecycle import proxy_request
from app.config import get_book_dir
from app.models import ChapterMeta, UpdateChapterRequest

router = APIRouter(prefix="/api/books/{book_id}/chapters", tags=["chapters"])


def _validate_book(book_id: str):
    """Ensure the book exists, raising 404 if not."""
    book_dir = get_book_dir(book_id)
    if not book_dir.exists():
        raise HTTPException(status_code=404, detail=f"Book '{book_id}' not found")


@router.get("/")
def list_chapters(book_id: str):
    """List all chapters for a book."""
    _validate_book(book_id)
    chapters = fm.list_chapters(book_id)
    return chapters


@router.get("/{num}")
def get_chapter(book_id: str, num: int):
    """Get a specific chapter by number."""
    _validate_book(book_id)
    chapter = fm.read_chapter(book_id, num)
    if chapter is None:
        raise HTTPException(status_code=404, detail=f"Chapter {num} not found")
    return chapter


@router.put("/{num}")
def update_chapter(book_id: str, num: int, req: UpdateChapterRequest):
    """Update a chapter's content and optionally its title."""
    _validate_book(book_id)
    now = datetime.now(timezone.utc).isoformat()
    chapter = fm.read_chapter(book_id, num)

    if chapter is None:
        # Create new chapter entry
        chapter = ChapterMeta(
            chapterNumber=num,
            title=req.title or "",
            content=req.content,
            outline=req.outline or "",
            qualityGate=req.qualityGate or "L1",
            createdAt=now,
            updatedAt=now,
        ).model_dump()
    else:
        chapter["content"] = req.content
        chapter["updatedAt"] = now
        if req.title is not None:
            chapter["title"] = req.title
        if req.outline is not None:
            chapter["outline"] = req.outline
        if req.qualityGate is not None:
            chapter["qualityGate"] = req.qualityGate

    fm.write_chapter(book_id, num, chapter)

    # Auto-commit
    from app.git_manager import auto_commit
    book_dir = get_book_dir(book_id)
    title = chapter.get("title", "")
    auto_commit(book_dir, f"Update chapter {num}" + (f": {title}" if title else ""))

    return chapter
