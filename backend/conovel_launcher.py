"""CoNovel Launcher — starts backend + agent engine, opens browser."""

import os
import sys
import subprocess
import webbrowser
import time
import signal
import atexit
from pathlib import Path

# Resolve paths (works for both dev and PyInstaller frozen)
if getattr(sys, 'frozen', False):
    BASE_DIR = Path(sys._MEIPASS)
    EXE_DIR = Path(sys.executable).parent
else:
    BASE_DIR = Path(__file__).parent.parent
    EXE_DIR = Path(__file__).parent

FRONTEND_DIR = BASE_DIR / "frontend" / "dist"
ENGINE_BINARY = EXE_DIR / "conovel-agent-engine"
ENGINE_SCRIPT = BASE_DIR / "agent-engine" / "src" / "agent-server.ts"

# Find frontend/dist by checking multiple locations
def find_frontend_dir() -> Path:
    candidates = [
        BASE_DIR / "frontend" / "dist",           # PyInstaller bundled
        Path.cwd() / "frontend" / "dist",          # Working directory
        EXE_DIR / "frontend" / "dist",             # Next to exe
        Path(__file__).parent / "frontend" / "dist", # Next to this file
        Path(__file__).parent.parent / "frontend" / "dist", # One level up
    ]
    for p in candidates:
        if p.exists() and (p / "index.html").exists():
            return p
    return BASE_DIR / "frontend" / "dist"  # Fallback

FRONTEND_DIR = find_frontend_dir()
print(f"[CoNovel] Frontend dir: {FRONTEND_DIR} (exists: {FRONTEND_DIR.exists()})", flush=True)

# Force-set the env var AND patch config module before import
os.environ["CONOVEL_FRONTEND_DIR"] = str(FRONTEND_DIR)
# Pre-import config to patch it
import app.config as _cfg
_cfg.FRONTEND_DIR = FRONTEND_DIR

# Processes to clean up
processes = []


def cleanup():
    for p in processes:
        try:
            p.terminate()
            p.wait(timeout=5)
        except Exception:
            try:
                p.kill()
            except Exception:
                pass


atexit.register(cleanup)


def find_free_port(preferred, fallback_range=range(3580, 3600)):
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('127.0.0.1', preferred))
            return preferred
        except OSError:
            pass
    for port in fallback_range:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', port))
                return port
            except OSError:
                continue
    return preferred


def start_agent_engine():
    """Start the Bun/Node agent engine."""
    engine_port = find_free_port(3583)

    # Check multiple paths for the engine
    engine_paths = [
        ENGINE_BINARY,                                                    # Pre-compiled binary
        EXE_DIR / "conovel-agent-engine.exe",                           # Next to exe
        BASE_DIR / "agent-engine" / "src" / "agent-server.ts",           # Bundled source
        Path.cwd() / "agent-engine" / "src" / "agent-server.ts",        # Working directory
    ]

    # Try binary first
    for ep in engine_paths:
        if ep.exists() and ep.suffix in ('', '.exe'):
            print(f"[CoNovel] Starting agent engine from {ep.name} on port {engine_port}...", flush=True)
            try:
                p = subprocess.Popen(
                    [str(ep)],
                    env={**os.environ, "PORT": str(engine_port)},
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )
                processes.append(p)
                return engine_port
            except Exception as e:
                print(f"[CoNovel] Failed to start engine: {e}", flush=True)

    # Try bun/node with source script
    script_path = BASE_DIR / "agent-engine" / "src" / "agent-server.ts"
    if script_path.exists():
        for cmd_name, cmd in [("bun", ["bun", "run"]), ("node", ["node"])]:
            try:
                print(f"[CoNovel] Starting agent engine via {cmd_name} on port {engine_port}...", flush=True)
                print(f"[CoNovel] Script path: {script_path} (exists: {script_path.exists()})", flush=True)
                p = subprocess.Popen(
                    cmd + [str(script_path)],
                    env={**os.environ, "PORT": str(engine_port)},
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )
                processes.append(p)
                # Wait briefly to check if it started
                import time
                time.sleep(2)
                if p.poll() is not None:
                    stderr_out = p.stderr.read().decode(errors="replace") if p.stderr else ""
                    print(f"[CoNovel] Agent engine exited with code {p.returncode}: {stderr_out[:200]}", flush=True)
                else:
                    return engine_port
            except FileNotFoundError as e:
                print(f"[CoNovel] {cmd_name} not found: {e}", flush=True)
                continue

    print(f"[CoNovel] Agent Engine 未启动 (需要安装 bun: https://bun.sh)", flush=True)
    print(f"[CoNovel] Pipeline/写作功能需要 Agent Engine，其他功能正常使用", flush=True)
    return engine_port


def start_backend(engine_port):
    """Start the Python FastAPI backend."""
    backend_port = find_free_port(3582)
    sys.path.insert(0, str(BASE_DIR / "backend"))

    os.environ["CONOVEL_PORT"] = str(backend_port)
    os.environ["CONOVEL_AGENT_ENGINE_PORT"] = str(engine_port)
    os.environ["CONOVEL_DATA_DIR"] = str(Path.home() / ".config" / "conovel")

    print(f"[CoNovel] Starting backend on port {backend_port}...")

    from app.main import app
    import uvicorn

    # Fix PyInstaller: redirect stderr/stdout to avoid 'NoneType isatty' error
    # Use a log file instead of devnull so we can debug issues
    log_dir = Path.home() / ".config" / "conovel"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "conovel.log"
    
    if sys.stderr is None or sys.stderr is None:
        sys.stderr = open(str(log_file), "a", encoding="utf-8")
    if sys.stdout is None:
        sys.stdout = open(str(log_file), "a", encoding="utf-8")

    print(f"[CoNovel] Log file: {log_file}", flush=True)

    # Run in a way that allows cleanup
    config = uvicorn.Config(
        app,
        host="127.0.0.1",
        port=backend_port,
        log_level="warning",
    )
    server = uvicorn.Server(config)

    # Open browser after a short delay
    def open_browser():
        time.sleep(2)
        webbrowser.open(f"http://127.0.0.1:{backend_port}")

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    print(f"[CoNovel] CoNovel is running at http://127.0.0.1:{backend_port}")
    print("[CoNovel] Press Ctrl+C to stop")

    try:
        server.run()
    except KeyboardInterrupt:
        print("\n[CoNovel] Shutting down...")
        cleanup()


def main():
    print("=" * 50)
    print("  CoNovel — Autonomous Multi-Agent Narrative System")
    print("=" * 50)
    print()

    engine_port = start_agent_engine()
    time.sleep(1)  # Give engine a moment to start
    start_backend(engine_port)


if __name__ == "__main__":
    main()
