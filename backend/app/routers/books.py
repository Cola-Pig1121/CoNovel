"""Books router — CRUD for books, characters, and character reviews."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app import file_manager as fm
from app.agent_lifecycle import proxy_request
from app.git_manager import auto_commit, create_branch, get_log, init_book_repo
from app.config import get_book_dir
from app.models import (
    BookState,
    CharacterProfile,
    CreateBookRequest,
    CreateCharacterRequest,
    UpdateBookRequest,
    UpdateCharacterRequest,
)

router = APIRouter(prefix="/api/books", tags=["books"])


# ── Helpers ────────────────────────────────────────────────────────────────

def _book_dir(book_id: str) -> Path:
    d = get_book_dir(book_id)
    if not d.exists():
        raise HTTPException(status_code=404, detail=f"Book '{book_id}' not found")
    return d


# ── Book CRUD ──────────────────────────────────────────────────────────────

@router.get("/")
def list_books():
    """List all books from the index."""
    index = fm.read_book_index()
    return index


@router.post("/")
def create_book(req: CreateBookRequest):
    """Create a new book: init repo, create state.json, create default constraints."""
    book_id = fm.generate_id()
    now = datetime.now(timezone.utc).isoformat()

    book_state = BookState(
        id=book_id,
        title=req.title,
        genre=req.genre,
        premise=req.premise,
        status="planning",
        createdAt=now,
        updatedAt=now,
    )

    # Create book directory and state
    book_dir = get_book_dir(book_id)
    book_dir.mkdir(parents=True, exist_ok=True)
    fm.write_book_state(book_id, book_state.model_dump())

    # Create .eve template with default agent config and constraints
    fm.create_book_eve_template(str(book_dir))

    # Init git repo
    init_book_repo(book_dir)

    # Initialize empty files
    fm.write_characters(book_id, [])
    fm.write_foreshadowing(book_id, [])
    fm.write_timeline(book_id, [])
    fm.write_outline(book_id, {"volumes": []})
    fm.write_world_settings(book_id, {})
    fm.write_style_profile(book_id, {})

    # Update book index
    index = fm.read_book_index()
    # Index entry is the BookMeta portion (without nested data)
    index_entry = book_state.model_dump()
    # Remove nested data lists from index entry
    for key in ("characters", "foreshadowing", "outline", "timeline", "worldSettings", "lastSyncedAt"):
        index_entry.pop(key, None)
    index.append(index_entry)
    fm.write_book_index(index)

    # Auto-commit initial state
    auto_commit(book_dir, "Initialize book: " + req.title)

    return index_entry


@router.get("/{book_id}")
def get_book(book_id: str):
    """Get full book state including all associated data."""
    _book_dir(book_id)
    state = fm.read_book_state(book_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Book state not found")
    # Merge all associated data into the flat BookState
    state["characters"] = fm.read_characters(book_id)
    state["foreshadowing"] = fm.read_foreshadowing(book_id)
    state["timeline"] = fm.read_timeline(book_id)
    state["outline"] = fm.read_outline(book_id) or {"volumes": []}
    state["worldSettings"] = fm.read_world_settings(book_id) or {}
    state["style"] = fm.read_style_profile(book_id)
    return state


@router.put("/{book_id}")
def update_book(book_id: str, req: UpdateBookRequest):
    """Update book meta fields."""
    _book_dir(book_id)
    state = fm.read_book_state(book_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Book state not found")

    if req.title is not None:
        state["title"] = req.title
    if req.genre is not None:
        state["genre"] = req.genre
    if req.premise is not None:
        state["premise"] = req.premise
    if req.status is not None:
        state["status"] = req.status
    if req.targetWordCount is not None:
        state["targetWordCount"] = req.targetWordCount
    if req.totalChapters is not None:
        state["totalChapters"] = req.totalChapters
    state["updatedAt"] = datetime.now(timezone.utc).isoformat()

    fm.write_book_state(book_id, state)

    # Update index
    index = fm.read_book_index()
    for i, entry in enumerate(index):
        if entry.get("id") == book_id:
            # Update index entry with the meta fields from state
            index_entry = {k: v for k, v in state.items()
                           if k not in ("characters", "foreshadowing", "outline",
                                        "timeline", "worldSettings", "lastSyncedAt", "style")}
            index[i] = index_entry
            break
    fm.write_book_index(index)

    # Auto-commit
    book_dir = get_book_dir(book_id)
    auto_commit(book_dir, f"Update book: {state.get('title', book_id)}")

    return state


@router.delete("/{book_id}")
def delete_book(book_id: str):
    """Delete a book and all its data."""
    book_dir = _book_dir(book_id)
    fm.remove_dir(book_dir)

    # Remove from index
    index = fm.read_book_index()
    index = [e for e in index if e.get("id") != book_id]
    fm.write_book_index(index)

    return {"deleted": book_id}


# ── Characters ─────────────────────────────────────────────────────────────

@router.get("/{book_id}/characters")
def list_characters(book_id: str):
    """List all characters for a book."""
    _book_dir(book_id)
    characters = fm.read_characters(book_id)
    return characters


@router.get("/{book_id}/characters/{char_id}")
def get_character(book_id: str, char_id: str):
    """Get a single character by ID."""
    _book_dir(book_id)
    characters = fm.read_characters(book_id)
    for c in characters:
        if c.get("id") == char_id:
            return c
    raise HTTPException(status_code=404, detail="Character not found")


@router.post("/{book_id}/characters")
def create_character(book_id: str, req: CreateCharacterRequest):
    """Create a new character."""
    _book_dir(book_id)
    now = datetime.now(timezone.utc).isoformat()
    char_id = fm.generate_id()
    character = CharacterProfile(
        id=char_id,
        name=req.name,
        role=req.role,
        createdAt=now,
        updatedAt=now,
    ).model_dump()

    characters = fm.read_characters(book_id)
    characters.append(character)
    fm.write_characters(book_id, characters)

    # Auto-commit
    book_dir = get_book_dir(book_id)
    auto_commit(book_dir, f"Add character: {req.name}")

    return character


@router.put("/{book_id}/characters/{char_id}")
def update_character(book_id: str, char_id: str, req: UpdateCharacterRequest):
    """Update an existing character."""
    _book_dir(book_id)
    character = fm.read_character(book_id, char_id)
    if character is None:
        raise HTTPException(status_code=404, detail=f"Character '{char_id}' not found")

    # Apply partial updates
    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            if isinstance(value, dict):
                # Merge nested dicts (e.g., personality, voice, etc.)
                if key in character and isinstance(character[key], dict):
                    character[key] = {**character[key], **value}
                else:
                    character[key] = value
            else:
                character[key] = value

    character["updatedAt"] = datetime.now(timezone.utc).isoformat()

    fm.write_character(book_id, character)

    # Auto-commit
    book_dir = get_book_dir(book_id)
    auto_commit(book_dir, f"Update character: {character.get('name', char_id)}")

    return character


@router.delete("/{book_id}/characters/{char_id}")
def delete_character(book_id: str, char_id: str):
    """Delete a character."""
    _book_dir(book_id)
    deleted = fm.delete_character(book_id, char_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Character '{char_id}' not found")

    # Auto-commit
    book_dir = get_book_dir(book_id)
    auto_commit(book_dir, f"Delete character: {char_id}")

    return {"deleted": char_id}


@router.post("/{book_id}/characters/review")
async def review_characters(book_id: str):
    """Trigger character intelligence review via the agent engine."""
    _book_dir(book_id)
    characters = fm.read_characters(book_id)
    if not characters:
        raise HTTPException(status_code=400, detail="No characters to review")

    constraints = fm.read_constraints(book_id)
    result = await proxy_request("POST", "/agent/character-review", {
        "bookId": book_id,
        "characters": characters,
        "constraints": constraints,
    })

    if "error" in result:
        raise HTTPException(status_code=result.get("status_code", 500), detail=result["error"])

    return result.get("data", result)


# ── Memory ────────────────────────────────────────────────────────────────

@router.get("/{book_id}/memory/snapshots")
def get_memory_snapshots(book_id: str):
    """Get all fact snapshots for a book."""
    _book_dir(book_id)
    return {"snapshots": fm.read_memory_snapshots(book_id)}


@router.get("/{book_id}/memory/summaries")
def get_memory_summaries(book_id: str):
    """Get all chapter summaries for a book."""
    _book_dir(book_id)
    return {"summaries": fm.read_memory_summaries(book_id)}


@router.get("/{book_id}/memory/character-states")
def get_character_states(book_id: str):
    """Get all character states from memory."""
    _book_dir(book_id)
    return {"states": fm.read_character_states(book_id)}


# ── Git Worktree ──────────────────────────────────────────────────────────


@router.post("/{book_id}/git/branch")
def create_git_branch(book_id: str, branch_name: str):
    """Create a git branch for plot exploration."""
    book_path = _book_dir(book_id)
    ok = create_branch(book_path, branch_name)
    if not ok:
        raise HTTPException(status_code=500, detail=f"Failed to create branch '{branch_name}'")
    return {"status": "ok", "branch": branch_name}


@router.get("/{book_id}/git/log")
def git_log(book_id: str, n: int = 20):
    """Get recent git commits."""
    book_path = _book_dir(book_id)
    log = get_log(book_path, n)
    return {"log": log}
