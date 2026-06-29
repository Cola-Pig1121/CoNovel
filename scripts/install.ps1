# CoNovel 安装脚本 (Windows)
# 自动检测环境，安装依赖，创建桌面快捷方式

$ErrorActionPreference = "Stop"
$CoNovelVersion = "0.1.0"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CoNovel - 自进化多Agent小说写作系统" -ForegroundColor Cyan
Write-Host "  安装程序 v$CoNovelVersion" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ===== 1. 检测 Python 环境 =====
Write-Host "[1/5] 检测 Python 环境..." -ForegroundColor Yellow

$pythonCmd = $null
try {
    $pythonCmd = (Get-Command python -ErrorAction SilentlyContinue).Source
    if (-not $pythonCmd) {
        $pythonCmd = (Get-Command python3 -ErrorAction SilentlyContinue).Source
    }
} catch {}

if (-not $pythonCmd) {
    Write-Host "  Python 未安装!" -ForegroundColor Red
    $install = Read-Host "  是否自动安装 Python? (Y/n)"
    if ($install -ne 'n' -and $install -ne 'N') {
        Write-Host "  正在安装 Python..." -ForegroundColor Yellow
        # Try winget first
        try {
            winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements
            $machinePath = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
            $userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
            $env:PATH = "$machinePath;$userPath"
            $pythonCmd = (Get-Command python -ErrorAction SilentlyContinue).Source
        } catch {
            Write-Host "  自动安装失败，请手动安装 Python 3.8+: https://www.python.org/downloads/" -ForegroundColor Red
            Write-Host "  安装时请勾选 'Add Python to PATH'" -ForegroundColor Yellow
            Read-Host "  安装完成后按回车继续"
            $pythonCmd = (Get-Command python -ErrorAction SilentlyContinue).Source
        }
    } else {
        Write-Host "  跳过 Python 安装。LLM功能将不可用。" -ForegroundColor Yellow
    }
}

if ($pythonCmd) {
    $pyVersion = & $pythonCmd --version 2>&1
    Write-Host "  Python: $pyVersion" -ForegroundColor Green
}

# ===== 2. 检测 Node.js 环境 =====
Write-Host "[2/5] 检测 Node.js 环境..." -ForegroundColor Yellow

$nodeVersion = $null
try {
    $nodeVersion = (Get-Command node -ErrorAction SilentlyContinue).Source
} catch {}

if (-not $nodeVersion) {
    Write-Host "  Node.js 未安装!" -ForegroundColor Red
    $install = Read-Host "  是否自动安装 Node.js? (Y/n)"
    if ($install -ne 'n' -and $install -ne 'N') {
        Write-Host "  正在安装 Node.js..." -ForegroundColor Yellow
        try {
            winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
            $machinePath = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
            $userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
            $env:PATH = "$machinePath;$userPath"
        } catch {
            Write-Host "  自动安装失败，请手动安装 Node.js 20+: https://nodejs.org/" -ForegroundColor Red
            Read-Host "  安装完成后按回车继续"
        }
    }
}

$nodeVer = node --version 2>&1
Write-Host "  Node.js: $nodeVer" -ForegroundColor Green

# ===== 3. 检测 pnpm =====
Write-Host "[3/5] 检测 pnpm..." -ForegroundColor Yellow

$hasPnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $hasPnpm) {
    Write-Host "  pnpm 未安装，正在安装..." -ForegroundColor Yellow
    npm install -g pnpm
}
$pnpmVer = pnpm --version 2>&1
Write-Host "  pnpm: $pnpmVer" -ForegroundColor Green

# ===== 4. 安装 CoNovel 依赖 =====
Write-Host "[4/5] 安装 CoNovel 依赖..." -ForegroundColor Yellow

$installDir = Join-Path $env:USERPROFILE "CoNovel"
Write-Host "  安装目录: $installDir"

# Check if already installed
if (Test-Path $installDir) {
    $update = Read-Host "  CoNovel 已安装，是否更新? (Y/n)"
    if ($update -eq 'n' -or $update -eq 'N') {
        Write-Host "  跳过安装" -ForegroundColor Yellow
    } else {
        Write-Host "  更新中..." -ForegroundColor Yellow
        Set-Location $installDir
        git pull
    }
} else {
    Write-Host "  正在下载 CoNovel..." -ForegroundColor Yellow
    git clone https://github.com/Cola-Pig1121/CoNovel.git $installDir
    Set-Location $installDir
}

Set-Location $installDir
Write-Host "  安装前端依赖..." -ForegroundColor Yellow
pnpm install

# ===== 5. 安装 Python 依赖 =====
if ($pythonCmd) {
    Write-Host "[5/5] 安装 Python 依赖 (litellm)..." -ForegroundColor Yellow
    & $pythonCmd -m pip install litellm --quiet
    Write-Host "  litellm 已安装" -ForegroundColor Green
} else {
    Write-Host "[5/5] 跳过 Python 依赖安装" -ForegroundColor Yellow
}

# ===== 创建桌面快捷方式 =====
Write-Host ""
Write-Host "创建桌面快捷方式..." -ForegroundColor Yellow

$desktop = [System.Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "CoNovel.lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "cmd.exe"
$shortcut.Arguments = "/c cd /d `"$installDir\packages\studio`" && pnpm dev"
$shortcut.WorkingDirectory = "$installDir\packages\studio"
$shortcut.Description = "CoNovel - 自进化多Agent小说写作系统"
$shortcut.WindowStyle = 7  # Minimized
$shortcut.Save()

Write-Host "  桌面快捷方式已创建: $shortcutPath" -ForegroundColor Green

# ===== 完成 =====
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  安装完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "启动方式:" -ForegroundColor Cyan
Write-Host "  1. 双击桌面 'CoNovel' 快捷方式" -ForegroundColor White
Write-Host "  2. 或在终端中运行:" -ForegroundColor White
Write-Host "     cd $installDir\packages\studio" -ForegroundColor Yellow
Write-Host "     pnpm dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "访问地址: http://localhost:3002" -ForegroundColor Cyan
Write-Host ""
Write-Host "首次使用:" -ForegroundColor Cyan
Write-Host "  1. 安装 Python 依赖: bash scripts/setup.sh" -ForegroundColor White
Write-Host "  2. 打开浏览器访问 http://localhost:3002" -ForegroundColor White
Write-Host "  3. 在设置页面配置模型供应商和API Key" -ForegroundColor White
Write-Host "  4. 创建第一个项目开始创作!" -ForegroundColor White
Write-Host ""
