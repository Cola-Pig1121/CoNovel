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

    if ENGINE_BINARY.exists():
        print(f"[CoNovel] Starting agent engine from binary on port {engine_port}...")
        p = subprocess.Popen(
            [str(ENGINE_BINARY)],
            env={**os.environ, "PORT": str(engine_port)},
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    elif ENGINE_SCRIPT.exists():
        print(f"[CoNovel] Starting agent engine from source on port {engine_port}...")
        # Try bun first, then node
        for cmd in [["bun", "run"], ["npx", "bun"], ["node"]]:
            try:
                p = subprocess.Popen(
                    cmd + [str(ENGINE_SCRIPT)],
                    env={**os.environ, "PORT": str(engine_port)},
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )
                processes.append(p)
                return engine_port
            except FileNotFoundError:
                continue
        print("[CoNovel] WARNING: Could not start agent engine (bun/node not found)")
        return engine_port
    else:
        print("[CoNovel] WARNING: Agent engine binary/script not found")
        return engine_port

    processes.append(p)
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

    # Run in a way that allows cleanup
    config = uvicorn.Config(
        app,
        host="127.0.0.1",
        port=backend_port,
        log_level="info",
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
