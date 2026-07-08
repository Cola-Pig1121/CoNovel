"""Pipeline router — start, check status, and cancel the writing pipeline."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app import file_manager as fm
from app.agent_lifecycle import proxy_request
from app.config import AGENT_ENGINE_URL, SERVER_PORT, get_book_dir
from app.models import CancelPipelineRequest, StartPipelineRequest

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])

# Pipeline stages matching the TypeScript PipelineStage type exactly
PIPELINE_STAGES = [
    "context_assembly",
    "character_reasoning",
    "writing",
    "event_recording",
    "fact_check",
    "continuity_check",
    "pacing_check",
    "character_intelligence_review",
    "review_round_1",
    "review_round_2",
    "review_round_3",
    "editing",
    "de_ai",
    "reflector",
    "state_sync",
]


@router.post("/start")
async def start_pipeline(req: StartPipelineRequest):
    """Start the writing pipeline for a specific book chapter."""
    book_dir = get_book_dir(req.bookId)
    if not book_dir.exists():
        raise HTTPException(status_code=404, detail=f"Book '{req.bookId}' not found")

    # Check if a pipeline is already running
    existing = fm.read_pipeline_state(req.bookId)
    if existing and existing.get("activeStage") is not None:
        raise HTTPException(status_code=409, detail="A pipeline is already running for this book")

    # Gather all context
    book_state = fm.read_book_state(req.bookId)
    characters = fm.read_characters(req.bookId)
    constraints = fm.read_constraints(req.bookId)
    agent_config = fm.read_agent_config()

    # Read previous chapter for continuity
    prev_chapter = None
    if req.chapterNumber > 1:
        prev_chapter = fm.read_chapter(req.bookId, req.chapterNumber - 1)

    # Read chapter content if available
    chapter_content = None
    if prev_chapter and prev_chapter.get("content"):
        chapter_content = prev_chapter["content"]

    # Build the payload expected by the agent engine
    # Agent engine expects: { book_path, chapter_number, chapter_content?, stages?, resume_from? }
    book_path = str(book_dir)
    payload = {
        "book_path": book_path,
        "chapter_number": req.chapterNumber,
    }
    if chapter_content:
        payload["chapter_content"] = chapter_content

    # Write initial pipeline state
    now = datetime.now(timezone.utc).isoformat()
    pipeline_state = {
        "bookId": req.bookId,
        "activeStage": PIPELINE_STAGES[0],
        "stages": [
            {"stage": stage, "status": "pending"}
            for stage in PIPELINE_STAGES
        ],
        "startedAt": now,
        "completedAt": None,
    }
    fm.write_pipeline_state(req.bookId, pipeline_state)

    # Proxy to agent engine (correct endpoint is /api/pipeline/execute)
    result = await proxy_request("POST", "/api/pipeline/execute", payload, timeout=300.0)

    if "error" in result:
        # Update pipeline state with error
        pipeline_state["activeStage"] = None
        pipeline_state["completedAt"] = datetime.now(timezone.utc).isoformat()
        fm.write_pipeline_state(req.bookId, pipeline_state)
        raise HTTPException(status_code=result.get("status_code", 500), detail=result["error"])

    # Trigger goal auto-update in background after pipeline completes
    asyncio.ensure_future(_auto_update_goals_async(req.bookId))

    return result.get("data", result)


@router.get("/status/{book_id}")
def get_pipeline_status(book_id: str):
    """Get the current pipeline state for a book."""
    book_dir = get_book_dir(book_id)
    if not book_dir.exists():
        raise HTTPException(status_code=404, detail=f"Book '{book_id}' not found")

    state = fm.read_pipeline_state(book_id)
    if state is None:
        return {"bookId": book_id, "activeStage": None, "stages": [], "startedAt": None, "completedAt": None}

    return state


@router.post("/cancel")
async def cancel_pipeline(req: CancelPipelineRequest):
    """Cancel a running pipeline for a book."""
    book_dir = get_book_dir(req.bookId)
    if not book_dir.exists():
        raise HTTPException(status_code=404, detail=f"Book '{req.bookId}' not found")

    state = fm.read_pipeline_state(req.bookId)
    if state is None or state.get("activeStage") is None:
        return {"status": "no_active_pipeline", "bookId": req.bookId}

    # Proxy cancellation to agent engine
    result = await proxy_request("POST", "/pipeline/cancel", {"bookId": req.bookId})

    # Update local state
    state["activeStage"] = None
    state["completedAt"] = datetime.now(timezone.utc).isoformat()
    fm.write_pipeline_state(req.bookId, state)

    return {"status": "cancelled", "bookId": req.bookId}


@router.get("/stream/{book_id}")
async def stream_pipeline(book_id: str, chapter_number: int = 1):
    """SSE endpoint that streams pipeline progress."""
    import json

    book_dir = get_book_dir(book_id)
    if not book_dir.exists():
        raise HTTPException(status_code=404, detail=f"Book '{book_id}' not found")

    async def event_generator():
        # Send initial state
        yield f"data: {json.dumps({'type': 'started', 'stage': 'context_assembly'})}\n\n"

        # Proxy to agent engine and stream events
        async with httpx.AsyncClient() as client:
            try:
                async with client.stream(
                    "POST",
                    f"{AGENT_ENGINE_URL}/api/pipeline/execute",
                    json={"bookPath": str(book_dir), "chapterNumber": chapter_number},
                    timeout=300.0,
                ) as response:
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            yield f"{line}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        yield "data: [DONE]\n\n"

        # Trigger goal auto-update after streaming completes
        asyncio.ensure_future(_auto_update_goals_async(book_id))

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _auto_update_goals_async(book_id: str):
    """Auto-update goals after pipeline completes.

    Waits briefly for the pipeline state to settle, then calls the
    goals auto-update endpoint.
    """
    import asyncio as _asyncio
    import logging

    logger = logging.getLogger(__name__)

    try:
        await _asyncio.sleep(3)  # Wait for pipeline state to settle
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"http://127.0.0.1:{SERVER_PORT}/api/books/{book_id}/goals/auto-update",
            )
            if resp.status_code == 200:
                logger.info(f"Goal auto-update triggered for book {book_id}: {resp.json()}")
            else:
                logger.warning(f"Goal auto-update returned {resp.status_code} for book {book_id}")
    except Exception as e:
        logger.debug(f"Goal auto-update background call failed (non-fatal): {e}")
