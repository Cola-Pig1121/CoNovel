# CoNovel Installer (Windows)
# Detects environment, installs dependencies, creates desktop shortcut

$ErrorActionPreference = "Stop"
$CoNovelVersion = "0.1.0"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CoNovel Installer v$CoNovelVersion" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- Helper function to refresh PATH ---
function Update-Path {
    $machinePath = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
    if ($machinePath -and $userPath) {
        $env:PATH = "$machinePath;$userPath"
    }
}

# --- Step 1: Check Python ---
Write-Host "[1/5] Checking Python..." -ForegroundColor Yellow

$pythonCmd = $null
try { $pythonCmd = (Get-Command python -ErrorAction SilentlyContinue).Source } catch {}
if (-not $pythonCmd) {
    try { $pythonCmd = (Get-Command python3 -ErrorAction SilentlyContinue).Source } catch {}
}

if (-not $pythonCmd) {
    Write-Host "  Python not found!" -ForegroundColor Red
    $install = Read-Host "  Install Python via winget? (Y/n)"
    if ($install -ne "n" -and $install -ne "N") {
        Write-Host "  Installing Python..." -ForegroundColor Yellow
        try {
            winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements
            Update-Path
            try { $pythonCmd = (Get-Command python -ErrorAction SilentlyContinue).Source } catch {}
        } catch {
            Write-Host "  Auto-install failed. Please install Python 3.8+ manually." -ForegroundColor Red
            Write-Host "  https://www.python.org/downloads/" -ForegroundColor Yellow
            Read-Host "  Press Enter after installing"
        }
    } else {
        Write-Host "  Skipping Python. LLM features will be unavailable." -ForegroundColor Yellow
    }
}

if ($pythonCmd) {
    $pyVersion = & $pythonCmd --version 2>&1
    Write-Host "  Python: $pyVersion" -ForegroundColor Green
}

# --- Step 2: Check Node.js ---
Write-Host "[2/5] Checking Node.js..." -ForegroundColor Yellow

$hasNode = Get-Command node -ErrorAction SilentlyContinue
if (-not $hasNode) {
    Write-Host "  Node.js not found!" -ForegroundColor Red
    $install = Read-Host "  Install Node.js via winget? (Y/n)"
    if ($install -ne "n" -and $install -ne "N") {
        Write-Host "  Installing Node.js..." -ForegroundColor Yellow
        try {
            winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
            Update-Path
        } catch {
            Write-Host "  Auto-install failed. Please install Node.js 20+ manually." -ForegroundColor Red
            Read-Host "  Press Enter after installing"
        }
    }
}

$nodeVer = node --version 2>&1
Write-Host "  Node.js: $nodeVer" -ForegroundColor Green

# --- Step 3: Check pnpm ---
Write-Host "[3/5] Checking pnpm..." -ForegroundColor Yellow

$hasPnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $hasPnpm) {
    Write-Host "  Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
}
$pnpmVer = pnpm --version 2>&1
Write-Host "  pnpm: $pnpmVer" -ForegroundColor Green

# --- Step 4: Install CoNovel ---
Write-Host "[4/5] Installing CoNovel..." -ForegroundColor Yellow

$installDir = Join-Path $env:USERPROFILE "CoNovel"
Write-Host "  Install directory: $installDir"

if (Test-Path $installDir) {
    $update = Read-Host "  CoNovel already installed. Update? (Y/n)"
    if ($update -ne "n" -and $update -ne "N") {
        Write-Host "  Updating..." -ForegroundColor Yellow
        Set-Location $installDir
        git pull
    }
} else {
    Write-Host "  Downloading CoNovel..." -ForegroundColor Yellow
    git clone https://github.com/Cola-Pig1121/CoNovel.git $installDir
}

Set-Location $installDir
Write-Host "  Installing frontend dependencies..." -ForegroundColor Yellow
pnpm install

# --- Step 5: Install Python deps ---
if ($pythonCmd) {
    Write-Host "[5/5] Installing Python dependencies (litellm)..." -ForegroundColor Yellow
    & $pythonCmd -m pip install litellm --quiet
    Write-Host "  litellm installed" -ForegroundColor Green
} else {
    Write-Host "[5/5] Skipping Python dependencies" -ForegroundColor Yellow
}

# --- Create Desktop Shortcut ---
Write-Host ""
Write-Host "Creating desktop shortcut..." -ForegroundColor Yellow

$desktop = [System.Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "CoNovel.lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "cmd.exe"
$shortcut.Arguments = "/c cd /d `"$installDir\packages\studio`" && pnpm dev"
$shortcut.WorkingDirectory = "$installDir\packages\studio"
$shortcut.Description = "CoNovel - AI Novel Writing System"
$shortcut.WindowStyle = 7
$shortcut.Save()

Write-Host "  Shortcut created: $shortcutPath" -ForegroundColor Green

# --- Done ---
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Installation complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start:" -ForegroundColor Cyan
Write-Host "  1. Double-click 'CoNovel' on Desktop" -ForegroundColor White
Write-Host "  2. Or run:" -ForegroundColor White
Write-Host "     cd $installDir\packages\studio" -ForegroundColor Yellow
Write-Host "     pnpm dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "URL: http://localhost:3002" -ForegroundColor Cyan
