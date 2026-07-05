"""CoNovel Backend — FastAPI main application."""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

import httpx

from app import agent_lifecycle, file_manager
from app.config import AGENT_ENGINE_URL, FRONTEND_DIR, SERVER_HOST, SERVER_PORT, ensure_data_dirs
from app.models import DeAIRequest, StyleAnalyzeRequest
from app.routers import agents, books, chapters, goals, pipeline, questions, settings, store

# ── Logging ────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("conovel")


# ── Lifespan ───────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: start/stop the agent engine."""
    # Startup
    logger.info("CoNovel Backend starting up...")
    ensure_data_dirs()
    logger.info("Data directory: %s", file_manager.DATA_DIR)

    # Try to start the agent engine (non-fatal if bun is not installed)
    result = agent_lifecycle.start_engine()
    if result.get("status") == "started":
        logger.info("Agent engine started (PID: %s)", result.get("pid"))
    else:
        logger.warning("Agent engine not started: %s", result.get("message", "unknown reason"))
        logger.info("Pipeline features will be unavailable without the agent engine")

    yield

    # Shutdown
    logger.info("CoNovel Backend shutting down...")
    stop_result = agent_lifecycle.stop_engine()
    logger.info("Agent engine stop: %s", stop_result.get("status", "done"))


# ── App ────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="CoNovel Backend",
    description="AI-powered novel writing assistant — control plane and file management",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS (permissive for development) ─────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3580", "http://localhost:3582", "http://127.0.0.1:3580", "http://127.0.0.1:3582"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include Routers ───────────────────────────────────────────────────────

app.include_router(books.router)
app.include_router(chapters.router)
app.include_router(agents.router)
app.include_router(pipeline.router)
app.include_router(settings.router)
app.include_router(store.router)
app.include_router(questions.router)
app.include_router(goals.router)


# ── System Endpoints ──────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    """Backend health check."""
    return {"status": "ok", "service": "conovel-backend"}


@app.get("/api/agent/health")
async def agent_health():
    """Agent engine health check (proxied)."""
    result = await agent_lifecycle.health_check()
    return result


@app.post("/api/agent/start")
def agent_start():
    """Manually start the agent engine."""
    result = agent_lifecycle.start_engine()
    return result


@app.post("/api/agent/stop")
def agent_stop():
    """Manually stop the agent engine."""
    result = agent_lifecycle.stop_engine()
    return result


@app.post("/api/style/analyze")
async def analyze_style(req: StyleAnalyzeRequest):
    """Proxy style analysis to agent engine."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{AGENT_ENGINE_URL}/api/style/analyze",
                json=req.model_dump(),
                timeout=60.0,
            )
            return resp.json()
        except httpx.ConnectError:
            return {"error": "Agent engine is not running", "status_code": 503}
        except Exception as e:
            return {"error": str(e), "status_code": 500}


@app.post("/api/tools/de-ai")
async def de_ai_text(req: DeAIRequest):
    """Proxy de-AI text processing to agent engine."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{AGENT_ENGINE_URL}/api/tools/de-ai",
                json=req.model_dump(),
                timeout=30.0,
            )
            return resp.json()
        except httpx.ConnectError:
            return {"error": "Agent engine is not running", "status_code": 503}
        except Exception as e:
            return {"error": str(e), "status_code": 500}


# ── Frontend Static Files & SPA Fallback ──────────────────────────────────

if FRONTEND_DIR.exists():
    # Serve static assets (JS, CSS, images, etc.)
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """SPA fallback: serve index.html for any non-API, non-asset route."""
        # API routes are handled by routers above, so we only reach here for non-API
        if full_path.startswith("api/"):
            return JSONResponse({"error": "Not found"}, status_code=404)

        # Try to serve the exact file first
        file_path = FRONTEND_DIR / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))

        # Fall back to index.html for SPA routing
        index_path = FRONTEND_DIR / "index.html"
        if index_path.exists():
            return FileResponse(str(index_path))

        return JSONResponse({"error": "Frontend not built"}, status_code=404)
else:
    @app.get("/")
    def no_frontend():
        return {
            "status": "ok",
            "message": "CoNovel Backend is running. Frontend not found at: " + str(FRONTEND_DIR),
        }


# ── Entrypoint ────────────────────────────────────────────────────────────

def run():
    """Run the server directly."""
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=SERVER_HOST,
        port=SERVER_PORT,
        reload=True,
    )


if __name__ == "__main__":
    run()
