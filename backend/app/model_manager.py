"""Model Manager — silent download of bge-small-zh embedding model."""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Optional

import httpx

logger = logging.getLogger("conovel.model_manager")

# Global state
_download_progress: dict = {
    "status": "idle",
    "percent": 0,
    "bytes_downloaded": 0,
    "total_bytes": 0,
    "error": None,
}
_model_ready: bool = False

MODEL_DIR = Path.home() / ".config" / "conovel" / "models" / "bge-small-zh"
MODEL_FILES = ["model.onnx", "tokenizer.json", "config.json"]

# Mirror URLs (Chinese-friendly first)
MIRRORS = [
    "https://hf-mirror.com/BAAI/bge-small-zh-v1.5/resolve/main",
    "https://huggingface.co/BAAI/bge-small-zh-v1.5/resolve/main",
]


def is_model_ready() -> bool:
    """Check if the model files exist locally."""
    return all((MODEL_DIR / f).exists() for f in MODEL_FILES)


def get_download_progress() -> dict:
    """Get current download progress."""
    return {**_download_progress, "modelReady": _model_ready}


async def download_model():
    """Download bge-small-zh model files from mirror with fallback."""
    global _download_progress, _model_ready

    if is_model_ready():
        _model_ready = True
        _download_progress["status"] = "ready"
        return

    _download_progress["status"] = "downloading"
    _download_progress["percent"] = 0
    _download_progress["error"] = None
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    for mirror in MIRRORS:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                for filename in MODEL_FILES:
                    url = f"{mirror}/{filename}"
                    filepath = MODEL_DIR / filename

                    _download_progress["percent"] = 0

                    async with client.stream("GET", url) as response:
                        if response.status_code != 200:
                            continue
                        total = int(response.headers.get("content-length", 0))
                        _download_progress["total_bytes"] = total

                        with open(filepath, "wb") as f:
                            downloaded = 0
                            async for chunk in response.aiter_bytes(chunk_size=8192):
                                f.write(chunk)
                                downloaded += len(chunk)
                                _download_progress["bytes_downloaded"] = downloaded
                                if total > 0:
                                    _download_progress["percent"] = int(
                                        downloaded / total * 100
                                    )

            _model_ready = True
            _download_progress["status"] = "ready"
            _download_progress["percent"] = 100
            logger.info("Model download complete: %s", MODEL_DIR)
            return
        except Exception as e:
            logger.warning("Mirror %s failed: %s", mirror, e)
            _download_progress["error"] = str(e)
            continue

    _download_progress["status"] = "failed"
    _download_progress["error"] = "All mirrors failed"
    logger.error("All mirrors failed for model download")


async def start_background_download():
    """Start model download in background (non-blocking)."""
    asyncio.create_task(download_model())
