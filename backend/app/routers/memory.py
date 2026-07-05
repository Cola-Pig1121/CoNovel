"""Memory router — standalone memory management endpoints."""

from __future__ import annotations

import re
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app import file_manager as fm

router = APIRouter(prefix="/api/memory", tags=["memory"])

# ---------------------------------------------------------------------------
# Extraction pattern lists
# ---------------------------------------------------------------------------

EMOTION_KEYWORDS = [
    "高兴", "愤怒", "悲伤", "恐惧", "惊讶", "期待",
    "绝望", "释然", "紧张", "兴奋", "失落", "安心",
]

HOOK_KEYWORDS = [
    "突然", "竟然", "居然", "没想到", "秘密", "真相",
    "隐藏", "伏笔",
]

TIME_REFERENCES = [
    "三天后", "一个月", "第二天", "黎明", "黄昏",
    "深夜", "清晨", "一周后",
]


class ExtractFactsRequest(BaseModel):
    book_id: str
    chapter_number: int
    content: str


@router.post("/extract")
def extract_facts(req: ExtractFactsRequest):
    """Trigger fact extraction for a chapter (proxy to agent engine)."""
    # Heuristic extraction: characters, emotions, hooks, time references
    # In production, this would call the agent engine's observer agent
    facts: list[dict] = []
    ch = req.chapter_number
    content = req.content

    # --- Character extraction ---
    chars = fm.read_characters(req.book_id)
    char_names = [c.get("name", "") for c in chars]
    for name in char_names:
        if name in content:
            facts.append({
                "id": f"fact_{ch}_char_{name}",
                "chapterNumber": ch,
                "category": "character",
                "subject": name,
                "content": f"{name} 在本章中出场",
                "confidence": 0.8,
            })

    # --- Emotion extraction ---
    emotion_patterns = re.findall(
        "(" + "|".join(re.escape(e) for e in EMOTION_KEYWORDS) + ")",
        content,
    )
    for emotion in emotion_patterns:
        facts.append({
            "id": f"fact_{ch}_emo_{emotion}_{len(facts)}",
            "chapterNumber": ch,
            "category": "emotion",
            "subject": emotion,
            "content": f"本章出现情绪: {emotion}",
            "confidence": 0.6,
        })

    # --- Hook / planting extraction ---
    hook_patterns = re.findall(
        "(" + "|".join(re.escape(h) for h in HOOK_KEYWORDS) + ")",
        content,
    )
    for hook in hook_patterns[:3]:  # limit to avoid noise
        facts.append({
            "id": f"fact_{ch}_hook_{hook}_{len(facts)}",
            "chapterNumber": ch,
            "category": "hook",
            "subject": hook,
            "content": f"本章出现伏笔/悬念关键词: {hook}",
            "confidence": 0.5,
        })

    # --- Time reference extraction ---
    time_patterns = re.findall(
        "(" + "|".join(re.escape(t) for t in TIME_REFERENCES) + ")",
        content,
    )
    for time_ref in time_patterns[:3]:  # limit
        facts.append({
            "id": f"fact_{ch}_time_{time_ref}_{len(facts)}",
            "chapterNumber": ch,
            "category": "time",
            "subject": time_ref,
            "content": f"本章出现时间参考: {time_ref}",
            "confidence": 0.5,
        })

    fm.write_memory_facts(req.book_id, req.chapter_number, facts)
    return {"extracted": len(facts), "facts": facts}


@router.post("/consolidate")
def consolidate(book_id: str):
    """Run memory consolidation."""
    # Basic consolidation: merge old facts into long-term memory
    all_facts = fm.read_memory_all_facts(book_id)
    fm.read_memory_summaries(book_id)

    long_term = fm.read_memory_long_term(book_id)
    world_facts = long_term.get("worldFacts", [])

    # Extract world facts from early chapters
    for fact in all_facts:
        if fact.get("category") == "location" and fact.get("chapterNumber", 0) < 5:
            if fact["content"] not in world_facts:
                world_facts.append(fact["content"])

    long_term["worldFacts"] = world_facts
    long_term["lastConsolidatedAt"] = datetime.now(timezone.utc).isoformat()
    fm.write_memory_long_term(book_id, long_term)

    return {"consolidated": True, "worldFacts": len(world_facts)}
