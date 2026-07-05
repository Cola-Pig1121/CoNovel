"""Integration tests for the CoNovel backend API.

Run with:  pytest tests/ -v
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


# ── Fixtures ────────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def temp_data_dir(monkeypatch, tmp_path):
    """Redirect all CoNovel file I/O to a disposable temp directory.

    Patches both ``app.config.DATA_DIR`` (the canonical source) **and**
    ``app.file_manager.DATA_DIR`` (the local binding created by the
    ``from app.config import DATA_DIR`` at module scope) so that every
    code-path — whether it uses the config helpers or the file_manager
    module-level name — writes into the same temp tree.

    Git operations are no-oped so tests never depend on a git install
    and avoid Windows file-locking issues with ``.git/`` removal.
    """
    conovel_dir = tmp_path / "conovel"
    books_dir = conovel_dir / "books"
    templates_dir = conovel_dir / "templates"

    os.makedirs(books_dir, exist_ok=True)
    os.makedirs(templates_dir, exist_ok=True)

    # Primary patch — the canonical Path in the config module.
    monkeypatch.setattr("app.config.DATA_DIR", conovel_dir)

    # Secondary patch — file_manager imports DATA_DIR at module level,
    # creating a local binding that won't follow the config-level patch
    # if the module was already loaded by a prior test.
    if "app.file_manager" in sys.modules:
        monkeypatch.setattr("app.file_manager.DATA_DIR", conovel_dir)

    # Neutralise git operations — not under test and rmtree on .git
    # can fail with PermissionError on Windows.
    monkeypatch.setattr("app.git_manager.init_book_repo", lambda _path: True)
    monkeypatch.setattr("app.git_manager.auto_commit", lambda _path, _msg="": True)

    yield tmp_path


@pytest.fixture
def client(temp_data_dir):
    """Yield a ``TestClient`` wired to the real FastAPI app."""
    from app.main import app  # noqa: E402 – imported inside fixture so patches are in place
    return TestClient(app)


# ── Helpers ──────────────────────────────────────────────────────────────────


def _create_book(
    client: TestClient,
    title: str = "Test Book",
    genre: str = "fantasy",
    premise: str = "A test premise",
) -> dict:
    """Create a book via the API and return the ``BookMeta`` dict."""
    resp = client.post(
        "/api/books/",
        json={"title": title, "genre": genre, "premise": premise},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


# ── 1. Book CRUD ────────────────────────────────────────────────────────────


class TestBookCRUD:
    """POST / GET / PUT / DELETE on /api/books."""

    def test_create_book(self, client):
        """POST /api/books → 200, returns BookMeta with id, title, genre."""
        resp = client.post(
            "/api/books/",
            json={
                "title": "My Novel",
                "genre": "sci-fi",
                "premise": "Space exploration adventure",
            },
        )
        assert resp.status_code == 200
        data = resp.json()

        assert "id" in data
        assert data["title"] == "My Novel"
        assert data["genre"] == "sci-fi"
        assert data["status"] == "planning"

    def test_list_books(self, client):
        """POST 2 books, GET /api/books → returns list of 2."""
        _create_book(client, title="Book One")
        _create_book(client, title="Book Two")

        resp = client.get("/api/books/")
        assert resp.status_code == 200
        books = resp.json()
        assert len(books) == 2

        titles = {b["title"] for b in books}
        assert titles == {"Book One", "Book Two"}

    def test_get_book(self, client):
        """POST create book, GET /api/books/{id} → full BookState."""
        book = _create_book(client)
        book_id = book["id"]

        resp = client.get(f"/api/books/{book_id}")
        assert resp.status_code == 200

        data = resp.json()
        assert data["id"] == book_id
        assert data["title"] == "Test Book"
        # Associated data lists should be present (empty).
        assert "characters" in data
        assert "outline" in data
        assert "timeline" in data
        assert "foreshadowing" in data

    def test_update_book(self, client):
        """POST create, PUT /api/books/{id} with new title → title updated."""
        book = _create_book(client)
        book_id = book["id"]

        resp = client.put(f"/api/books/{book_id}", json={"title": "Updated Title"})
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Title"

        # Verify persistence.
        resp = client.get(f"/api/books/{book_id}")
        assert resp.json()["title"] == "Updated Title"

    def test_delete_book(self, client):
        """POST create, DELETE /api/books/{id} → book gone from list."""
        book = _create_book(client)
        book_id = book["id"]

        resp = client.delete(f"/api/books/{book_id}")
        assert resp.status_code == 200
        assert resp.json()["deleted"] == book_id

        # Gone from list.
        resp = client.get("/api/books/")
        assert len(resp.json()) == 0

        # 404 on direct get.
        resp = client.get(f"/api/books/{book_id}")
        assert resp.status_code == 404


# ── 2. .eve Template ────────────────────────────────────────────────────────


class TestEveTemplate:
    """Verify the .eve scaffold created alongside every book."""

    def test_eve_template_generated(self, client, temp_data_dir):
        """POST create book → .eve/agent-config.json has all agent configs."""
        book = _create_book(client)
        book_id = book["id"]

        eve_dir = temp_data_dir / "conovel" / "books" / book_id / ".eve"
        assert eve_dir.exists(), ".eve directory was not created"

        config_path = eve_dir / "agent-config.json"
        assert config_path.exists(), "agent-config.json was not created"

        with open(config_path, encoding="utf-8") as f:
            config = json.load(f)

        # Every role defined in file_manager.DEFAULT_AGENT_CONFIG must be present.
        expected_roles = [
            "executive_editor",
            "story_architect",
            "narrative_writer",
            "character_designer",
            "character_intelligence",
            "reviewer",
            "editor",
            "de_ai_editor",
            "fact_checker",
            "continuity_checker",
            "pacing_controller",
            "foreshadowing_tracker",
            "style_analyzer",
            "observer",
            "radar",
            "reflector",
            "default",
        ]
        for role in expected_roles:
            assert role in config, f"Missing agent config role: {role}"
        assert len(config) == len(expected_roles)

    def test_eve_constraints_generated(self, client, temp_data_dir):
        """POST create book → .eve/constraints/ has all 5 default files."""
        book = _create_book(client)
        book_id = book["id"]

        constraints_dir = (
            temp_data_dir / "conovel" / "books" / book_id / ".eve" / "constraints"
        )
        assert constraints_dir.exists(), ".eve/constraints directory was not created"

        expected_files = {
            "style-constraints.md",
            "banned-words.md",
            "plot-constraints.md",
            "character-rules.md",
            "writing-guide.md",
        }
        actual_files = {p.name for p in constraints_dir.iterdir()}
        assert actual_files == expected_files


# ── 3. Chapters ─────────────────────────────────────────────────────────────


class TestChapters:
    """Chapter CRUD via /api/books/{id}/chapters."""

    def test_create_chapter(self, client):
        """Create book, PUT chapter 1 → chapter saved with content & word count."""
        book = _create_book(client)
        book_id = book["id"]

        payload = {
            "content": "Once upon a time in a galaxy far away, something happened.",
            "title": "Chapter 1: The Beginning",
        }
        resp = client.put(f"/api/books/{book_id}/chapters/1", json=payload)
        assert resp.status_code == 200

        chapter = resp.json()
        assert chapter["chapterNumber"] == 1
        assert chapter["title"] == payload["title"]
        assert chapter["content"] == payload["content"]
        assert chapter["wordCount"] > 0

    def test_get_chapters(self, client):
        """Create book with 3 chapters, GET list → returns 3."""
        book = _create_book(client)
        book_id = book["id"]

        for i in range(1, 4):
            resp = client.put(
                f"/api/books/{book_id}/chapters/{i}",
                json={"content": f"Content for chapter {i}.", "title": f"Chapter {i}"},
            )
            assert resp.status_code == 200

        resp = client.get(f"/api/books/{book_id}/chapters/")
        assert resp.status_code == 200
        chapters = resp.json()
        assert len(chapters) == 3

        nums = {c["chapterNumber"] for c in chapters}
        assert nums == {1, 2, 3}


# ── 4. Characters ───────────────────────────────────────────────────────────


class TestCharacters:
    """Full CRUD cycle on /api/books/{id}/characters."""

    def test_character_crud(self, client):
        """Create → list(1) → update → delete → list(0)."""
        book = _create_book(client)
        book_id = book["id"]

        # --- Create --------------------------------------------------------
        resp = client.post(
            f"/api/books/{book_id}/characters",
            json={"name": "Alice", "role": "protagonist"},
        )
        assert resp.status_code == 200
        char = resp.json()
        char_id = char["id"]
        assert char["name"] == "Alice"
        assert char["role"] == "protagonist"

        # --- List → 1 ------------------------------------------------------
        resp = client.get(f"/api/books/{book_id}/characters")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

        # --- Update --------------------------------------------------------
        resp = client.put(
            f"/api/books/{book_id}/characters/{char_id}",
            json={"name": "Alice Updated", "role": "hero"},
        )
        assert resp.status_code == 200
        updated = resp.json()
        assert updated["name"] == "Alice Updated"
        assert updated["role"] == "hero"

        # --- Delete --------------------------------------------------------
        resp = client.delete(f"/api/books/{book_id}/characters/{char_id}")
        assert resp.status_code == 200
        assert resp.json()["deleted"] == char_id

        # --- List → 0 ------------------------------------------------------
        resp = client.get(f"/api/books/{book_id}/characters")
        assert resp.status_code == 200
        assert len(resp.json()) == 0


# ── 5. Settings / Providers ─────────────────────────────────────────────────


class TestSettings:
    """Provider configuration endpoints."""

    def test_providers(self, client):
        """GET → empty list; PUT → providers persisted."""
        # Initially empty.
        resp = client.get("/api/settings/providers")
        assert resp.status_code == 200
        assert resp.json()["providers"] == []

        # Write providers.
        new_providers = [
            {
                "id": "openai",
                "name": "OpenAI",
                "baseUrl": "https://api.openai.com/v1",
                "apiFormat": "openai",
                "apiKey": "sk-test",
                "models": [
                    {"id": "gpt-4o", "name": "GPT-4o", "contextWindow": 128000, "maxOutput": 4096}
                ],
                "enabled": True,
            }
        ]
        resp = client.put("/api/settings/providers", json={"providers": new_providers})
        assert resp.status_code == 200
        assert len(resp.json()["providers"]) == 1
        assert resp.json()["providers"][0]["id"] == "openai"

        # Verify persistence.
        resp = client.get("/api/settings/providers")
        assert len(resp.json()["providers"]) == 1
        assert resp.json()["providers"][0]["name"] == "OpenAI"


# ── 6. Agent Config ─────────────────────────────────────────────────────────


class TestAgents:
    """Agent configuration endpoint."""

    def test_agent_config(self, client):
        """GET /api/agents/config → returns config with expected fields."""
        resp = client.get("/api/agents/config")
        assert resp.status_code == 200
        config = resp.json()["config"]

        # The default config is a single agent-config dict.
        assert "role" in config
        assert config["role"] == "writer"
        assert "provider" in config
        assert "temperature" in config
        assert "maxTokens" in config


# ── 7. Store ────────────────────────────────────────────────────────────────


class TestStore:
    """Local template store endpoint."""

    def test_store_local(self, client):
        """GET /api/store/local → returns empty list initially."""
        resp = client.get("/api/store/local")
        assert resp.status_code == 200
        assert resp.json() == []


# ── 8. Health ───────────────────────────────────────────────────────────────


class TestHealth:
    """System health check."""

    def test_health(self, client):
        """GET /api/health → returns {"status": "ok"}."""
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["service"] == "conovel-backend"
