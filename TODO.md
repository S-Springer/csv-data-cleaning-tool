# TidyCSV — Implementation Roadmap

> Last updated: 2026-03-23  
> Current status: Tier 1-3 implemented and smoke-tested  
> Branch: `main`

---

## 0. Review Gate (Do This First)
> Align docs and architecture notes before writing new feature code.

- [x] Confirm async architecture direction:
  - Current implementation uses in-process threaded jobs (`/api/jobs/{job_id}` polling).
  - Original roadmap language says "Celery + Redis worker".
  - Decide one path now:
    - Keep in-process worker for desktop/local simplicity, or
    - Move to full Celery worker for production-scale queueing.
- [x] Refresh product/docs source of truth:
  - Update `README.md` version/date and "Recent Updates" to include Tier 1-3 work.
  - Remove stale "future enhancements" items already implemented (rate limiting, undo/redo, multi-format support, heatmap basics).
  - Add new endpoints to docs: `/api/data/stats/{file_id}`, `/api/jobs/{job_id}`, async query param behavior.

---

## 1. Stabilization Sprint (Highest Priority)
> Convert implemented features into production-reliable behavior.

- [x] Add backend tests for Tier 3:
  - Cache hit/miss tests for `/analyze` and `/stats`.
  - Async job flow tests for clean and AI (`pending -> running -> completed/failed`).
  - Job 404 test for unknown `job_id`.
- [x] Add regression tests for known bug fixes:
  - Preview endpoint NaN/Inf serialization guard.
  - Multiple repeated preview calls under rate limits.
- [x] Add lightweight observability:
  - Structured logs for cache usage (`hit`, `miss`, `fallback`).
  - Structured logs for job lifecycle (`submitted`, `started`, `completed`, `failed`).
  - Add response metadata field (optional) like `served_from_cache` where helpful.
- [x] Define cache invalidation policy explicitly:
  - Invalidate on `clean` completion and file delete.
  - Document per-endpoint TTL values.
- [x] Harden error responses:
  - Normalize error payload schema for job failures.
  - Ensure AI errors in async mode surface actionable messages.

---

## 2. UX Completeness Sprint
> Expose new backend capabilities cleanly in UI.

- [x] Add async mode controls in frontend:
  - Optional "Run in background" toggle on cleaning and AI actions.
  - Show job status pill (`pending`, `running`, `completed`, `failed`).
  - Poll `/api/jobs/{job_id}` and render terminal result in place.
- [x] Improve analysis experience:
  - Add scatter plot matrix for numeric columns.
  - Add quick filters (column picker, top-N categories) for visualizations.
- [x] Add auth UI flow:
  - Register/login/logout controls.
  - Store token securely and attach bearer token in API client.
  - Add per-user file listing UX.

---

## 3. Platform Sprint (Scale + Deploy)
> Prepare for reproducible environments and cloud-hosted use.

- [ ] Add containerized local stack:
  - `docker-compose.yml` with `backend`, `frontend`, `redis`.
  - Environment-variable driven configuration for API URLs and Redis host.
- [ ] Deployment guide:
  - One simple target first (Railway or Fly.io).
  - Include build commands, env vars, health check endpoints, and rollback steps.
- [ ] Introduce queue implementation choice from Section 0:
  - If keeping threaded queue: document limits and concurrency constraints.
  - If migrating to Celery: add worker process config and retry policy.

---

## 4. Data Intelligence Sprint
> Add higher-level quality automation after platform is stable.

- [ ] ML-assisted quality detection:
  - Detect implicit nulls and schema anomalies.
  - Add near-duplicate / fuzzy duplicate heuristics.
  - Add suspicious outlier explanations in plain language.
- [ ] Scheduled processing/API key workflows:
  - API key management endpoints.
  - Scheduled or batch processing endpoints with status tracking.

---

## Completed Milestones

- [x] Tier 1: Multi-format upload, API rate limiting, correlation heatmap
- [x] Tier 2: Undo/redo, advanced stats endpoint + panel, multi-format export
- [x] Tier 3: Rebrand, caching layer (`redis` + `fakeredis` fallback), async job API
- [x] Smoke validation: Tier 1/2 full pass; Tier 3 endpoint checks added
