"""Questions router — manage interactive questionnaires between agents and users."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/questions", tags=["questions"])

# In-memory store for pending questionnaires (lost on restart, that's OK)
# In production, this would be in the agent engine's memory
_pending: list[dict] = []


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
    pending = [q for q in _pending if q.get("status") == "pending"]
    return pending


@router.post("")
def create_questionnaire(req: CreateQuestionnaireRequest):
    """Create a new questionnaire (called by agent engine)."""
    import time
    q = {
        "id": f"q_{int(time.time() * 1000)}",
        "questions": [q.model_dump() for q in req.questions],
        "createdAt": __import__("datetime").datetime.now().isoformat(),
        "status": "pending",
    }
    _pending.append(q)
    return q


@router.post("/{questionnaire_id}/answer")
def answer_questionnaire(questionnaire_id: str, req: AnswerRequest):
    """Submit answers to a questionnaire."""
    for q in _pending:
        if q["id"] == questionnaire_id:
            q["answers"] = [a.model_dump() for a in req.answers]
            q["status"] = "answered"
            return {"ok": True}
    raise HTTPException(status_code=404, detail="Questionnaire not found")


@router.post("/{questionnaire_id}/cancel")
def cancel_questionnaire(questionnaire_id: str):
    """Cancel a pending questionnaire."""
    for q in _pending:
        if q["id"] == questionnaire_id:
            q["status"] = "cancelled"
            return {"ok": True}
    raise HTTPException(status_code=404, detail="Questionnaire not found")
