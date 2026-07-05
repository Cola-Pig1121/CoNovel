"""Memory router — standalone memory management endpoints."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app import file_manager as fm

router = APIRouter(prefix="/api/memory", tags=["memory"])


class ExtractFactsRequest(BaseModel):
    book_id: str
    chapter_number: int
    content: str


@router.post("/extract")
def extract_facts(req: ExtractFactsRequest):
    """Trigger fact extraction for a chapter (proxy to agent engine)."""
    # For now, do basic heuristic extraction
    # In production, this would call the agent engine's observer agent
    facts = []
    # Basic character extraction
    chars = fm.read_characters(req.book_id)
    char_names = [c.get("name", "") for c in chars]
    for name in char_names:
        if name in req.content:
            facts.append({
                "id": f"fact_{req.chapter_number}_char_{name}",
                "chapterNumber": req.chapter_number,
                "category": "character",
                "subject": name,
                "content": f"{name} 在本章中出场",
                "confidence": 0.8,
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
