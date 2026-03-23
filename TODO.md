# TidyCSV — Development Roadmap

> Last updated: 2026-03-17  
> Current version: v0.3.1  
> Branch: `main` | Commit: `9cde012`

---

## Tier 1 — Quick Wins
> Low effort, high value. Implement these first.

- [x] **Multi-format upload** — Accept `.xlsx` and `.json` alongside `.csv`. `pandas.read_excel()` and `pandas.read_json()` handle parsing; update the file-type validation in `data_routes.py` and the upload hint text in `FileUpload.js`.
- [x] **API rate limiting** — Add `slowapi` middleware to FastAPI to prevent abuse on upload and AI endpoints. Minimal config change in `main.py`.
- [x] **Correlation heatmap** — Backend computes `df.corr()` and returns the matrix; frontend renders it as a colour-coded table (or uses Recharts `Cell`). Add to the Visualizations tab in `DataAnalysis.js`.

---

## Tier 2 — Medium Effort
> Meaningful UX improvements that need a bit more design thought.

- [x] **Undo / redo cleaning operations** — Track applied cleaning steps in a history stack (frontend state or lightweight backend session store). Let users roll back individual steps before downloading.
- [x] **Advanced stats panel** — Expose box-plot stats (min, Q1, median, Q3, max, IQR), percentile breakdowns, and skewness/kurtosis per column. Add a new "Stats" tab in `DataAnalysis.js` backed by a `/api/data/stats/{file_id}` endpoint.
- [x] **Export formats** — Let users download cleaned data as `.xlsx` or `.json` in addition to `.csv`. Use `pandas.to_excel()` / `pandas.to_json()` in `cleaner.py` and add format selector to the download button.

---

## Tier 3 — More Involved
> Architectural improvements and larger scope changes.

- [x] **TidyCSV rebrand** — Rename project references across all files:
  - `frontend/package.json` → `name` field
  - `frontend/src/App.js` → footer text
  - `backend/app/main.py` → FastAPI `title=`
  - `main_win.py` → `webview.create_window()` title
  - `README.md` → H1 heading and all mentions
- [x] **Redis caching** — Cache analysis results (`/api/data/analyze`) and AI insights per file hash so repeated requests skip recomputation. Add `redis-py` + `fakeredis` for local dev fallback.
- [x] **Async job queue** — Offload long-running cleans and AI calls to a Celery + Redis worker. Return a job ID immediately; poll `/api/jobs/{job_id}` for status. Prevents request timeouts on large files.

---

## Backlog / Future Enhancements

- [ ] Scatter plot matrix for pairwise numeric column relationships
- [ ] Real-time collaboration (shared session via WebSockets)
- [ ] User authentication UI (register / login flow wired to existing JWT backend)
- [ ] Cloud deployment guide (Docker Compose + Fly.io or Railway)
- [ ] ML-based data quality detection (detect label leakage, duplicate near-matches, implicit nulls)
- [ ] Scheduled / batch file processing via API key
- [ ] Dark mode toggle

---

## Completed

- [x] FastAPI backend with SQLAlchemy + SQLite
- [x] JWT authentication (register / login / `/me`)
- [x] CSV upload, preview, analysis, and cleaning endpoints
- [x] OpenAI-compatible AI insights endpoint (`POST /api/data/ai/insights/{file_id}`)
- [x] React 18 frontend with accordion-step DataCleaner
- [x] AIAssistant component with structured insight display
- [x] DataAnalysis tabs (Overview, Visualizations, Quality, Issues)
- [x] Consistent UX polish across all panels (empty states, loading states, action labels)
- [x] PyInstaller desktop EXE with all dependencies bundled
- [x] Git history clean, pushed to `main` on GitHub
