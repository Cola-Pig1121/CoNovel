"""Store router — local template browsing, import, and export."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app import file_manager as fm
from app.config import get_book_dir, get_templates_dir
from app.git_manager import export_template, import_from_github
from app.models import ExportTemplateRequest, ImportTemplateRequest, StoreExportRequest, StoreImportRequest

router = APIRouter(prefix="/api/store", tags=["store"])


@router.get("/local")
def list_local_templates():
    """List locally available templates."""
    templates = fm.list_local_templates()
    return templates


@router.post("/import")
def import_template(req: ImportTemplateRequest):
    """Import a template from a GitHub repository via git clone."""
    # Determine name from URL if not provided
    name = req.name
    if not name:
        name = req.repoUrl.rstrip("/").split("/")[-1]
        if name.endswith(".git"):
            name = name[:-4]

    target_dir = get_templates_dir() / name
    success = import_from_github(req.repoUrl, target_dir)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to clone repository")

    return {"imported": name, "path": str(target_dir)}


@router.post("/import-v2")
def import_template_v2(req: StoreImportRequest):
    """Import a template from a GitHub repository via git clone."""
    folder_name = req.repo_url.rstrip("/").split("/")[-1].replace(".git", "")
    target_dir = get_templates_dir() / folder_name
    success = import_from_github(req.repo_url, target_dir)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to clone repository")

    return {"name": folder_name, "path": str(target_dir)}


@router.post("/export")
def export_book_as_template(req: ExportTemplateRequest):
    """Export a book as a reusable template."""
    book_dir = get_book_dir(req.bookId)
    if not book_dir.exists():
        raise HTTPException(status_code=404, detail=f"Book '{req.bookId}' not found")

    target_dir = get_templates_dir()
    success = export_template(book_dir, req.name, target_dir)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to export template")

    return {"exported": req.name, "path": str(target_dir / req.name)}


@router.post("/export-v2")
def export_book_as_template_v2(req: StoreExportRequest):
    """Export a book as a reusable template."""
    book_dir = get_book_dir(req.book_id)
    if not book_dir.exists():
        raise HTTPException(status_code=404, detail=f"Book '{req.book_id}' not found")

    target_dir = get_templates_dir()
    success = export_template(book_dir, req.name, target_dir)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to export template")

    return {"path": str(target_dir / req.name)}
