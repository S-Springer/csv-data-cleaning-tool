param(
    [string]$PythonExe = ".\\.conda\\python.exe",
    [string]$RequirementsFile = "backend/requirements-build-lock.txt",
    [string]$Version = "0.1.0",
    [switch]$SkipFrontendBuild
)

$ErrorActionPreference = "Stop"

function Resolve-IsccPath {
    $candidates = @(
        "$env:ProgramFiles(x86)\\Inno Setup 6\\ISCC.exe",
        "$env:ProgramFiles\\Inno Setup 6\\ISCC.exe"
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    $fromPath = Get-Command ISCC.exe -ErrorAction SilentlyContinue
    if ($fromPath) {
        return $fromPath.Source
    }

    return $null
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$resolvedPython = $PythonExe
if (Test-Path $PythonExe) {
    $resolvedPython = (Resolve-Path $PythonExe).Path
}
else {
    $pythonCmd = Get-Command $PythonExe -ErrorAction SilentlyContinue
    if ($pythonCmd) {
        $resolvedPython = $pythonCmd.Source
    }
    else {
        throw "Python executable not found at '$PythonExe'."
    }
}

if (-not (Test-Path $RequirementsFile)) {
    throw "Requirements file not found at '$RequirementsFile'."
}

$pythonVersion = & $resolvedPython -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
if ([version]$pythonVersion -gt [version]"3.12") {
    throw "Python $pythonVersion detected. Use Python 3.11 or 3.12 for pandas/pyinstaller compatibility."
}

Write-Host "Using Python $pythonVersion at $resolvedPython"

if (-not $SkipFrontendBuild) {
    Write-Host "Building frontend..."
    Push-Location "frontend"
    try {
        npm install
        npm run build
    }
    finally {
        Pop-Location
    }
}

Write-Host "Installing Python dependencies..."
& $resolvedPython -m pip install -r $RequirementsFile

Write-Host "Building desktop executable..."
& $resolvedPython -m PyInstaller --clean --noconfirm "csv-data-tool.spec"

$exePath = Join-Path $repoRoot "dist\\csv-data-tool.exe"
if (-not (Test-Path $exePath)) {
    throw "Expected EXE was not found at '$exePath'."
}

$isccPath = Resolve-IsccPath
if (-not $isccPath) {
    throw "Inno Setup compiler (ISCC.exe) not found. Install Inno Setup 6 first: https://jrsoftware.org/isinfo.php"
}

Write-Host "Compiling installer with Inno Setup..."
& $isccPath "/DMyAppVersion=$Version" "/DSourceExe=$exePath" "installer\\tidycsv.iss"

$installerDir = Join-Path $repoRoot "dist\\installer"
Write-Host "Installer output directory: $installerDir"
