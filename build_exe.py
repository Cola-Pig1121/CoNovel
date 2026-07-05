"""Build CoNovel as a single .exe using PyInstaller."""

import subprocess
import sys
import shutil
from pathlib import Path

ROOT = Path(__file__).parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIST = ROOT / "frontend" / "dist"
AGENT_ENGINE = ROOT / "agent-engine"
DATA_DIR = ROOT / "data"
STORE_PRESETS = ROOT / "store-presets"

def main():
    print("=" * 50)
    print("  CoNovel — Building .exe")
    print("=" * 50)

    # Step 1: Build frontend
    print("\n[1/4] Building frontend...")
    subprocess.run("npx vite build", cwd=ROOT / "frontend", check=True, shell=True)

    # Step 2: Prepare build directory
    print("\n[2/4] Preparing build directory...")
    build_dir = ROOT / "build"
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir()

    # Copy frontend dist
    shutil.copytree(FRONTEND_DIST, build_dir / "frontend" / "dist")

    # Copy data and store-presets
    shutil.copytree(DATA_DIR, build_dir / "data")
    shutil.copytree(STORE_PRESETS, build_dir / "store-presets")

    # Copy agent engine source (for bun to run)
    shutil.copytree(AGENT_ENGINE, build_dir / "agent-engine",
                    ignore=shutil.ignore_patterns("node_modules", ".git", "dist", "nul"))

    # Step 3: Run PyInstaller
    print("\n[3/4] Running PyInstaller...")
    subprocess.run([
        sys.executable, "-m", "PyInstaller",
        "--onefile",
        "--noconsole",
        "--name", "CoNovel",
        "--distpath", str(build_dir / "dist"),
        "--workpath", str(build_dir / "build"),
        "--specpath", str(build_dir),
        "--add-data", f"{build_dir / 'frontend'};frontend",
        "--add-data", f"{build_dir / 'data'};data",
        "--add-data", f"{build_dir / 'store-presets'};store-presets",
        "--add-data", f"{build_dir / 'agent-engine'};agent-engine",
        str(BACKEND_DIR / "conovel_launcher.py"),
    ], check=True)

    # Step 4: Cleanup
    print("\n[4/4] Cleaning up...")
    exe_path = build_dir / "dist" / "CoNovel.exe"
    if exe_path.exists():
        # Copy to project root for easy access
        shutil.copy2(exe_path, ROOT / "CoNovel.exe")
        print(f"\n✅ Build complete!")
        print(f"   Exe: {ROOT / 'CoNovel.exe'}")
        print(f"   Size: {(ROOT / 'CoNovel.exe').stat().st_size / 1024 / 1024:.1f} MB")
    else:
        print(f"\n❌ Build failed — exe not found at {exe_path}")

    # Cleanup temp build dir
    shutil.rmtree(build_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
