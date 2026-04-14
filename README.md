# TidyCSV

Clean, analyze, and export CSV data with a FastAPI backend, React frontend, and optional Windows desktop wrapper.

Last updated: 2026-04-14

## What It Does

- Upload CSV files (single or chunked for large files)
- Analyze data quality, statistics, and column distributions
- Clean data with ordered operations (missing values, strings, scaling, duplicates, outliers)
- Run clean/AI tasks in background jobs with status polling
- Visualize data with histograms, correlations, and scatter matrix tools
- Export processed datasets as CSV, JSON, or XLSX
- Optional auth flow (register/login/logout) with per-user file listings

## Stack

- Backend: FastAPI, Pandas, NumPy, SQLAlchemy, Redis/fakeredis fallback
- Frontend: React 18, Axios, Recharts
- Desktop: PyInstaller wrapper around the web app

## Quick Start

### 1) Backend

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend URLs:

- API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs

### 2) Frontend

```bash
cd frontend
npm install
npm start
```

Frontend URL:

- App: http://localhost:3000

## Core Endpoints

### Data

- `POST /api/data/upload`
- `POST /api/data/upload/batch`
- `GET /api/data/analyze/{file_id}`
- `GET /api/data/stats/{file_id}`
- `POST /api/data/clean/{file_id}`
- `GET /api/data/preview/{file_id}`
- `GET /api/data/download/{file_id}?format=csv|json|xlsx`
- `GET /api/data/files`
- `DELETE /api/data/files/{file_id}`

### AI + Async Jobs

- `POST /api/data/ai/insights/{file_id}`
- `GET /api/jobs/{job_id}`

Both clean and AI endpoints support async mode via `?run_async=true`.

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

## Frontend Capabilities

- Background job toggle and status polling in UI
- Auth session persistence and token-attached API calls
- Visualization controls:
  - Numeric/categorical column filters
  - Top-N category selection
  - Scatter plot matrix for selected numeric columns

## Smoke Tests

From project root:

```bash
python smoke_test_tier1_tier2.py
python smoke_test_tier3.py
```

These scripts validate end-to-end upload, analysis, cleaning, export, caching, and async-job behavior.

## Desktop Build (Windows)

```bash
cd frontend
npm install
npm run build

cd ..
pyinstaller --noconfirm --onefile --add-data "frontend\build;frontend\build" --add-data "backend\app;app" --name tidycsv main_win.py
```

Built executable is placed in `dist/`.

## Windows Installer Build (.exe installer)

This project includes an Inno Setup installer script so testers can install/uninstall via a standard setup wizard.

Prerequisites:

- Python 3.11 or 3.12 (3.14 is not supported by pinned `pandas==2.1.3`)
- Node.js + npm
- Inno Setup 6 (`ISCC.exe`)

One-command build from repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-windows-installer.ps1 -PythonExe backend\.conda-py312\python.exe -Version 0.1.0
```

Run that command from the repository root. If you are already in the repo root, keep the script path as `./scripts/build-windows-installer.ps1`.

Recommended long-term local setup:

```powershell
conda create -p backend/.conda-py312 python=3.12 -y
backend/.conda-py312/python.exe -m pip install -r backend/requirements-build-lock.txt
```

Outputs:

- Desktop app EXE: `dist/csv-data-tool.exe`
- Installer EXE: `dist/installer/TidyCSV-Setup-<version>.exe`

Installer config is in `installer/tidycsv.iss`.
Build dependency lock file is in `backend/requirements-build-lock.txt`.

## Automated Release Build (GitHub Actions)

The workflow in `.github/workflows/windows-release.yml` builds both EXE and installer on:

- Tag push: `v*` (for example `v0.1.0`)
- Manual run (`workflow_dispatch`)

Release artifacts:

- `dist/csv-data-tool.exe`
- `dist/installer/TidyCSV-Setup-<version>.exe`

## Desktop Troubleshooting

- `127.0.0.1 refused to connect` after opening the app:
  - The app does not need internet; this usually means backend startup failed.
  - Rebuild using the pinned Python 3.12 environment command above.
- `ModuleNotFoundError` from packaged EXE (for example `slowapi`):
  - Re-run the installer build script from repo root to regenerate `dist/csv-data-tool.exe` with current spec settings.
- `ImportError` involving `_ssl` on startup:
  - Use the provided `csv-data-tool.spec` and Python 3.12 environment; OpenSSL runtime DLLs are included by that configuration.

## Project Layout

```text
backend/   FastAPI app, services, API routes, tests
frontend/  React app, components, styles, API client
main_win.py  Desktop entry point
TODO.md    Roadmap and sprint tracking
```

## Environment Notes

- Python 3.11/3.12 is recommended for best package compatibility.
- AI integration uses environment variables such as `AI_API_KEY`, `AI_MODEL`, and optional `AI_BASE_URL`.

## Roadmap

For current implementation status and next sprint items, see `TODO.md`.

## License

MIT
