"""Goals router — manage writing goals for books."""

from __future__ import annotations

import os
import json
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import DATA_DIR

router = APIRouter(prefix="/api/books/{book_id}/goals", tags=["goals"])


def _goals_dir(book_id: str) -> Path:
    d = DATA_DIR / "books" / book_id / ".goals"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _read_goal(goal_path: Path) -> dict:
    return json.loads(goal_path.read_text(encoding="utf-8"))


def _write_goal(goal_path: Path, data: dict):
    goal_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _generate_milestones(objective: str) -> list[dict]:
    """Auto-generate milestones from objective text."""
    base = [
        {"id": "m_1", "description": "明确目标范围和约束", "completed": False},
        {"id": "m_2", "description": "完成核心内容创作", "completed": False},
        {"id": "m_3", "description": "质量审查与修订", "completed": False},
        {"id": "m_4", "description": "最终确认与交付", "completed": False},
    ]
    return base


class CreateGoalRequest(BaseModel):
    objective: str
    milestones: list[str] | None = None


class UpdateStatusRequest(BaseModel):
    status: str  # active, paused, blocked, complete
    reason: str | None = None


class UpdateProgressRequest(BaseModel):
    progress: int  # 0-100


@router.get("")
def list_goals(book_id: str):
    """List all goals for a book."""
    goals_dir = _goals_dir(book_id)
    goals = []
    for f in sorted(goals_dir.glob("*.json")):
        try:
            goals.append(_read_goal(f))
        except Exception:
            continue
    return goals


@router.post("")
def create_goal(book_id: str, req: CreateGoalRequest):
    """Create a new goal."""
    goal_id = f"goal_{int(time.time() * 1000)}"
    now = __import__("datetime").datetime.now().isoformat()

    milestones = []
    if req.milestones:
        for i, desc in enumerate(req.milestones):
            milestones.append({
                "id": f"m_{i + 1}",
                "description": desc,
                "completed": False,
            })
    else:
        milestones = _generate_milestones(req.objective)

    goal = {
        "id": goal_id,
        "bookId": book_id,
        "objective": req.objective,
        "status": "active",
        "progress": 0,
        "milestones": milestones,
        "createdAt": now,
        "updatedAt": now,
        "history": [
            {"timestamp": now, "type": "created", "message": f"目标已创建: {req.objective}"}
        ],
    }

    goal_path = _goals_dir(book_id) / f"{goal_id}.json"
    _write_goal(goal_path, goal)
    return goal


@router.put("/{goal_id}/status")
def update_goal_status(book_id: str, goal_id: str, req: UpdateStatusRequest):
    """Update goal status (pause/resume/block/complete)."""
    goal_path = _goals_dir(book_id) / f"{goal_id}.json"
    if not goal_path.exists():
        raise HTTPException(status_code=404, detail="Goal not found")

    goal = _read_goal(goal_path)
    now = __import__("datetime").datetime.now().isoformat()

    goal["status"] = req.status
    goal["updatedAt"] = now

    status_messages = {
        "paused": "目标已暂停",
        "resumed": "目标已恢复",
        "blocked": f"目标已阻塞: {req.reason or '未知原因'}",
        "complete": "目标已完成",
    }

    event_type = "paused" if req.status == "paused" else \
                 "resumed" if req.status == "active" else \
                 "blocked" if req.status == "blocked" else \
                 "completed"

    goal["history"].append({
        "timestamp": now,
        "type": event_type,
        "message": status_messages.get(req.status, f"状态变更为 {req.status}"),
    })

    if req.status == "complete":
        goal["completedAt"] = now
        goal["progress"] = 100

    _write_goal(goal_path, goal)
    return goal


@router.put("/{goal_id}/progress")
def update_goal_progress(book_id: str, goal_id: str, req: UpdateProgressRequest):
    """Update goal progress percentage."""
    goal_path = _goals_dir(book_id) / f"{goal_id}.json"
    if not goal_path.exists():
        raise HTTPException(status_code=404, detail="Goal not found")

    goal = _read_goal(goal_path)
    now = __import__("datetime").datetime.now().isoformat()

    goal["progress"] = max(0, min(100, req.progress))
    goal["updatedAt"] = now
    goal["history"].append({
        "timestamp": now,
        "type": "progress",
        "message": f"进度更新为 {req.progress}%",
    })

    _write_goal(goal_path, goal)
    return goal


@router.post("/{goal_id}/milestones/{milestone_id}/complete")
def complete_milestone(book_id: str, goal_id: str, milestone_id: str):
    """Mark a milestone as complete."""
    goal_path = _goals_dir(book_id) / f"{goal_id}.json"
    if not goal_path.exists():
        raise HTTPException(status_code=404, detail="Goal not found")

    goal = _read_goal(goal_path)
    now = __import__("datetime").datetime.now().isoformat()

    found = False
    for m in goal.get("milestones", []):
        if m["id"] == milestone_id:
            m["completed"] = True
            m["completedAt"] = now
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="Milestone not found")

    # Auto-complete goal if all milestones done
    all_done = all(m["completed"] for m in goal.get("milestones", []))
    if all_done and goal["milestones"]:
        goal["status"] = "complete"
        goal["progress"] = 100
        goal["completedAt"] = now

    goal["updatedAt"] = now
    goal["history"].append({
        "timestamp": now,
        "type": "milestone",
        "message": f"里程碑已完成: {milestone_id}",
    })

    _write_goal(goal_path, goal)
    return goal


@router.delete("/{goal_id}")
def delete_goal(book_id: str, goal_id: str):
    """Delete a goal."""
    goal_path = _goals_dir(book_id) / f"{goal_id}.json"
    if not goal_path.exists():
        raise HTTPException(status_code=404, detail="Goal not found")
    goal_path.unlink()
    return {"ok": True}
