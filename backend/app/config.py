"""Application configuration for CoNovel backend."""

from __future__ import annotations

import os
import socket
from pathlib import Path


def find_free_port(preferred: int, fallback_range: range = range(3580, 3600)) -> int:
    """Try preferred port first, then scan for a free one."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('127.0.0.1', preferred))
            return preferred
        except OSError:
            pass
    for port in fallback_range:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', port))
                return port
            except OSError:
                continue
    raise RuntimeError("No free port found")

# ── Paths ──────────────────────────────────────────────────────────────────

DATA_DIR = Path(os.environ.get("CONOVEL_DATA_DIR", Path.home() / ".config" / "conovel"))
FRONTEND_DIR = Path(os.environ.get("CONOVEL_FRONTEND_DIR", Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"))

# ── Agent Engine ───────────────────────────────────────────────────────────

AGENT_ENGINE_PORT = find_free_port(int(os.environ.get("CONOVEL_AGENT_ENGINE_PORT", "3583")))
AGENT_ENGINE_URL = os.environ.get("CONOVEL_AGENT_ENGINE_URL", f"http://127.0.0.1:{AGENT_ENGINE_PORT}")

# ── Server ─────────────────────────────────────────────────────────────────

SERVER_HOST = os.environ.get("CONOVEL_HOST", "0.0.0.0")
SERVER_PORT = find_free_port(int(os.environ.get("CONOVEL_PORT", "3582")))

# ── Git ────────────────────────────────────────────────────────────────────

GIT_AUTHOR_NAME = "CoNovel"
GIT_AUTHOR_EMAIL = "conovel@local"


# ── Helper functions ───────────────────────────────────────────────────────

def ensure_data_dirs() -> None:
    """Create the base data directories if they don't exist."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    books_dir = DATA_DIR / "books"
    books_dir.mkdir(parents=True, exist_ok=True)
    templates_dir = DATA_DIR / "templates"
    templates_dir.mkdir(parents=True, exist_ok=True)


def get_books_dir() -> Path:
    """Return the books directory, creating it if needed."""
    d = DATA_DIR / "books"
    d.mkdir(parents=True, exist_ok=True)
    return d


def get_book_dir(book_id: str) -> Path:
    """Return the directory for a specific book."""
    return get_books_dir() / book_id


def get_templates_dir() -> Path:
    """Return the templates directory, creating it if needed."""
    d = DATA_DIR / "templates"
    d.mkdir(parents=True, exist_ok=True)
    return d
