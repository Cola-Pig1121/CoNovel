"""Workflows router — manage workflow definitions and runs."""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app import file_manager as fm
from app.agent_lifecycle import proxy_request
from app.config import DATA_DIR, get_book_dir

router = APIRouter(prefix="/api/workflows", tags=["workflows"])

# Path to bundled workflow definitions
WORKFLOWS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "agent-engine" / "workflows"


# ── Workflow Definition Helpers ────────────────────────────────────────────

def _list_workflow_defs() -> list[dict]:
    """List all workflow definitions from the bundled workflows directory."""
    if not WORKFLOWS_DIR.exists():
        return []
    workflows = []
    for f in sorted(WORKFLOWS_DIR.glob("*.json")):
        try:
            spec = json.loads(f.read_text("utf-8"))
            workflows.append({
                "name": f.stem,
                "description": spec.get("description", ""),
                "stages": len(spec.get("artifactGraph", {}).get("stages", [])),
                "schemaVersion": spec.get("schemaVersion", 1),
            })
        except Exception:
            continue
    return workflows


def _get_workflow_spec(name: str) -> dict | None:
    """Get a specific workflow definition."""
    path = WORKFLOWS_DIR / f"{name}.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text("utf-8"))
    except Exception:
        return None


# ── Run State Helpers ─────────────────────────────────────────────────────

def _get_runs_dir(book_id: str) -> Path:
    """Get the runs directory for a book."""
    runs_dir = get_book_dir(book_id) / ".workflow-runs"
    runs_dir.mkdir(parents=True, exist_ok=True)
    return runs_dir


def _find_run_file(run_id: str) -> Path | None:
    """Search across all books for a run file by ID."""
    books_dir = DATA_DIR / "books"
    if not books_dir.exists():
        return None
    for book_dir in books_dir.iterdir():
        if not book_dir.is_dir():
            continue
        run_path = book_dir / ".workflow-runs" / f"{run_id}.json"
        if run_path.exists():
            return run_path
    return None


def _read_run(run_id: str) -> dict:
    """Read a run record by ID, raising 404 if not found."""
    path = _find_run_file(run_id)
    if path is None:
        raise HTTPException(404, f"Run '{run_id}' not found")
    return json.loads(path.read_text("utf-8"))


def _write_run(path: Path, data: dict) -> None:
    """Write a run record to disk."""
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), "utf-8")


def _update_run_status(run_id: str, status: str) -> dict:
    """Update a run's status. Returns the updated record."""
    path = _find_run_file(run_id)
    if path is None:
        raise HTTPException(404, f"Run '{run_id}' not found")
    data = json.loads(path.read_text("utf-8"))
    data["status"] = status
    if status in ("cancelled", "completed"):
        data["completedAt"] = datetime.now(timezone.utc).isoformat()
    _write_run(path, data)
    return data


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.get("")
def list_workflows():
    """List all available workflow definitions."""
    return _list_workflow_defs()


@router.get("/{name}")
def get_workflow(name: str):
    """Get a specific workflow definition."""
    spec = _get_workflow_spec(name)
    if not spec:
        raise HTTPException(404, f"Workflow '{name}' not found")
    return spec


@router.post("/{name}/start")
async def start_workflow(name: str, body: dict = {}):
    """Start a workflow run for a book."""
    book_id = body.get("bookId")
    if not book_id:
        raise HTTPException(400, "bookId is required")

    book_dir = get_book_dir(book_id)
    if not book_dir.exists():
        raise HTTPException(404, f"Book '{book_id}' not found")

    spec = _get_workflow_spec(name)
    if not spec:
        raise HTTPException(404, f"Workflow '{name}' not found")

    # Create run record
    run_id = f"run_{int(time.time() * 1000)}"
    runs_dir = _get_runs_dir(book_id)
    now = datetime.now(timezone.utc).isoformat()

    stages = []
    for s in spec.get("artifactGraph", {}).get("stages", []):
        stages.append({"stageId": s["id"], "status": "pending", "tasks": []})

    run_record = {
        "id": run_id,
        "workflowName": name,
        "status": "running",
        "bookId": book_id,
        "startedAt": now,
        "completedAt": None,
        "stages": stages,
        "context": {},
    }

    run_path = runs_dir / f"{run_id}.json"
    _write_run(run_path, run_record)

    # Trigger the workflow via agent engine
    try:
        book_path = str(book_dir)
        payload = {
            "book_path": book_path,
            "chapter_number": body.get("chapterNumber", 1),
            "workflowName": name,
        }
        await proxy_request("POST", "/api/pipeline/execute", payload, timeout=300.0)
    except Exception:
        pass  # Non-fatal, workflow will run in background

    return run_record


# ── Run Management ────────────────────────────────────────────────────────

@router.get("/runs/{run_id}")
def get_run_status(run_id: str):
    """Get the status of a workflow run."""
    return _read_run(run_id)


@router.post("/runs/{run_id}/pause")
def pause_run(run_id: str):
    """Pause a running workflow."""
    return _update_run_status(run_id, "paused")


@router.post("/runs/{run_id}/resume")
def resume_run(run_id: str):
    """Resume a paused workflow."""
    return _update_run_status(run_id, "running")


@router.post("/runs/{run_id}/cancel")
def cancel_run(run_id: str):
    """Cancel a running workflow."""
    return _update_run_status(run_id, "cancelled")
