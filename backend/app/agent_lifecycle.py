"""Bun Agent Engine lifecycle management."""

from __future__ import annotations

import asyncio
import logging
import shutil
import signal
import subprocess
import sys
from pathlib import Path

import httpx

from app.config import AGENT_ENGINE_PORT, AGENT_ENGINE_URL

logger = logging.getLogger("conovel.agent_lifecycle")

_engine_process: subprocess.Popen | None = None


def _find_bun_binary() -> str | None:
    """Locate the bun binary, checking common locations."""
    # Check PATH first
    bun_path = shutil.which("bun")
    if bun_path:
        return bun_path

    # Check common install locations
    candidates = [
        Path.home() / ".bun" / "bin" / "bun",
        Path("/usr/local/bin/bun"),
        Path("/opt/homebrew/bin/bun"),
    ]

    # On Windows, try .exe extension
    if sys.platform == "win32":
        candidates = [Path(str(p) + ".exe") for p in candidates] + candidates

    for candidate in candidates:
        if candidate.exists():
            return str(candidate)

    return None


def _find_engine_script() -> Path | None:
    """Locate the agent engine entry point."""
    import os

    # In PyInstaller, use sys._MEIPASS
    if getattr(sys, 'frozen', False):
        base = Path(sys._MEIPASS)
    else:
        base = Path(__file__).resolve().parent.parent.parent

    candidates = [
        base / "agent-engine" / "src" / "agent-server.ts",
        base / "agent-engine" / "src" / "index.ts",
        Path(os.environ.get("CONOVEL_DATA_DIR", "")) / "agent-engine" / "src" / "agent-server.ts",
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return None


def start_engine() -> dict:
    """Start the Bun Agent Engine process."""
    global _engine_process

    if _engine_process is not None and _engine_process.poll() is None:
        return {"status": "already_running", "pid": _engine_process.pid}

    bun_bin = _find_bun_binary()
    if not bun_bin:
        return {"status": "error", "message": "bun binary not found"}

    engine_script = _find_engine_script()
    if not engine_script:
        return {"status": "error", "message": "agent engine script not found"}

    try:
        _engine_process = subprocess.Popen(
            [bun_bin, "run", str(engine_script)],
            cwd=str(engine_script.parent.parent),
            env={**dict(__import__("os").environ), "PORT": str(AGENT_ENGINE_PORT)},
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding="utf-8",
            errors="replace",
        )
        logger.info("Agent engine started with PID %d", _engine_process.pid)
        return {"status": "started", "pid": _engine_process.pid}
    except FileNotFoundError as e:
        return {"status": "error", "message": str(e)}
    except OSError as e:
        return {"status": "error", "message": str(e)}


def stop_engine() -> dict:
    """Stop the Bun Agent Engine process."""
    global _engine_process

    if _engine_process is None:
        return {"status": "not_running"}

    if _engine_process.poll() is not None:
        _engine_process = None
        return {"status": "already_stopped"}

    try:
        _engine_process.terminate()
        try:
            _engine_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            _engine_process.kill()
            _engine_process.wait(timeout=3)
        logger.info("Agent engine stopped")
        _engine_process = None
        return {"status": "stopped"}
    except OSError as e:
        return {"status": "error", "message": str(e)}


def is_running() -> bool:
    """Check if the agent engine process is alive."""
    if _engine_process is None:
        return False
    return _engine_process.poll() is None


async def health_check() -> dict:
    """Check the health of the agent engine via HTTP."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{AGENT_ENGINE_URL}/health")
            if resp.status_code == 200:
                return {"status": "healthy", "data": resp.json()}
            return {"status": "unhealthy", "code": resp.status_code}
    except httpx.ConnectError:
        return {"status": "unreachable"}
    except httpx.TimeoutException:
        return {"status": "timeout"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


async def proxy_request(
    method: str,
    path: str,
    json_data: dict | None = None,
    timeout: float = 120.0,
) -> dict:
    """Proxy an HTTP request to the agent engine."""
    url = f"{AGENT_ENGINE_URL}{path}"
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            if method.upper() == "GET":
                resp = await client.get(url)
            elif method.upper() == "POST":
                resp = await client.post(url, json=json_data)
            elif method.upper() == "PUT":
                resp = await client.put(url, json=json_data)
            elif method.upper() == "DELETE":
                resp = await client.delete(url)
            else:
                return {"error": f"Unsupported method: {method}"}

            return {
                "status_code": resp.status_code,
                "data": resp.json() if resp.headers.get("content-type", "").startswith("application/json") else resp.text,
            }
    except httpx.ConnectError:
        return {"error": "Agent engine is not running", "status_code": 503}
    except httpx.TimeoutException:
        return {"error": "Agent engine request timed out", "status_code": 504}
    except Exception as e:
        return {"error": str(e), "status_code": 500}
