"""Agents router — agent configuration management."""

from __future__ import annotations

import json

from fastapi import APIRouter, Request

from app import file_manager as fm

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("/config")
def get_agent_config():
    """Read the current agent configuration."""
    config = fm.read_agent_config()
    return {"config": config}


@router.put("/config")
async def update_agent_config(request: Request):
    """Replace the entire agent config.

    The frontend sends either an array of config objects (one per agent)
    or a single config dict.  We store whatever it sends directly.
    """
    raw = await request.body()
    body = json.loads(raw)
    # body could be a list or a dict — write it as-is
    fm.write_agent_config(body)
    return {"config": body}
