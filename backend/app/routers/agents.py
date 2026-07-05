"""Agents router — agent configuration management."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app import file_manager as fm

router = APIRouter(prefix="/api/agents", tags=["agents"])


class AgentConfigUpdate(BaseModel):
    role: str | None = None
    name: str | None = None
    nameZh: str | None = None
    provider: str | None = None
    modelId: str | None = None
    temperature: float | None = None
    maxTokens: int | None = None
    contextWindow: int | None = None
    reasoningEffort: str | None = None
    enabled: bool | None = None


@router.get("/config")
def get_agent_config():
    """Read the current agent configuration."""
    config = fm.read_agent_config()
    return {"config": config}


@router.put("/config")
def update_agent_config(req: AgentConfigUpdate):
    """Update the agent configuration (partial update)."""
    config = fm.read_agent_config()
    update_data = req.model_dump(exclude_unset=True)
    config.update(update_data)
    fm.write_agent_config(config)
    return {"config": config}
