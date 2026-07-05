"""Settings router — provider and model configuration."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app import file_manager as fm

router = APIRouter(prefix="/api/settings", tags=["settings"])


class ProviderUpdate(BaseModel):
    providers: list[dict]


@router.get("/providers")
def get_providers():
    """Read the list of configured providers."""
    providers = fm.read_providers()
    return {"providers": providers}


@router.put("/providers")
def update_providers(req: ProviderUpdate):
    """Replace the entire providers list."""
    fm.write_providers(req.providers)
    return {"providers": req.providers}
