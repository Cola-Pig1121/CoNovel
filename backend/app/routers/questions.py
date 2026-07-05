"""Questions router — manage interactive questionnaires between agents and users."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import DATA_DIR

router = APIRouter(prefix="/api/questions", tags=["questions"])

# ---------------------------------------------------------------------------
# File-based question storage — persists across restarts
# ---------------------------------------------------------------------------

QUESTIONS_DIR = DATA_DIR / "questions"


def _ensure_dir() -> None:
    QUESTIONS_DIR.mkdir(parents=True, exist_ok=True)


def _read_all() -> list[dict]:
    _ensure_dir()
    results: list[dict] = []
    for f in sorted(QUESTIONS_DIR.glob("*.json")):
        try:
            results.append(json.loads(f.read_text(encoding="utf-8")))
        except Exception:
            continue
    return results


def _write_question(q: dict) -> None:
    _ensure_dir()
    (QUESTIONS_DIR / f"{q['id']}.json").write_text(
        json.dumps(q, ensure_ascii=False, indent=2), encoding="utf-8"
    )


class QuestionOption(BaseModel):
    label: str
    description: str
    preview: str | None = None


class Question(BaseModel):
    question: str
    header: str
    options: list[QuestionOption]
    multiSelect: bool = False


class CreateQuestionnaireRequest(BaseModel):
    questions: list[Question]


class QuestionAnswer(BaseModel):
    questionIndex: int
    question: str
    kind: str  # "option" | "custom" | "multi"
    answer: str | None = None
    selected: list[str] | None = None
    notes: str | None = None


class AnswerRequest(BaseModel):
    answers: list[QuestionAnswer]


@router.get("/pending")
def list_pending():
    """List all pending questionnaires."""
    pending = [q for q in _read_all() if q.get("status") == "pending"]
    return pending


@router.post("")
def create_questionnaire(req: CreateQuestionnaireRequest):
    """Create a new questionnaire (called by agent engine)."""
    import time

    q = {
        "id": f"q_{int(time.time() * 1000)}",
        "questions": [question.model_dump() for question in req.questions],
        "createdAt": __import__("datetime").datetime.now().isoformat(),
        "status": "pending",
    }
    _write_question(q)
    return q


@router.post("/{questionnaire_id}/answer")
def answer_questionnaire(questionnaire_id: str, req: AnswerRequest):
    """Submit answers to a questionnaire."""
    for q in _read_all():
        if q["id"] == questionnaire_id:
            q["answers"] = [a.model_dump() for a in req.answers]
            q["status"] = "answered"
            _write_question(q)
            return {"ok": True}
    raise HTTPException(status_code=404, detail="Questionnaire not found")


@router.post("/{questionnaire_id}/cancel")
def cancel_questionnaire(questionnaire_id: str):
    """Cancel a pending questionnaire."""
    for q in _read_all():
        if q["id"] == questionnaire_id:
            q["status"] = "cancelled"
            _write_question(q)
            return {"ok": True}
    raise HTTPException(status_code=404, detail="Questionnaire not found")
