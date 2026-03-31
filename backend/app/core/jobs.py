"""
In-process async job queue backed by a thread pool.

Provides the same external API contract as a Celery-based queue:
  - submit(fn, *args, **kwargs) → job_id (str)
  - get_job(job_id) → {status, result, error} | None

For production workloads, swap this module for the Celery implementation in
celery_worker.py — the /api/jobs/{job_id} polling contract remains the same.
"""

import threading
import uuid
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable, Dict, Optional

logger = logging.getLogger(__name__)

# Worker pool — 4 threads handles typical desktop/small-team workloads.
_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="tidycsv-worker")

# In-memory job registry — keyed by job_id.
_jobs: Dict[str, dict] = {}
_lock = threading.Lock()


def _run(job_id: str, fn: Callable, args: tuple, kwargs: dict) -> None:
    """Worker wrapper: updates job state around the user-supplied callable."""
    with _lock:
        _jobs[job_id]["status"] = "running"
    logger.info("job_started job_id=%s", job_id)
    try:
        result = fn(*args, **kwargs)
        with _lock:
            _jobs[job_id]["status"] = "completed"
            _jobs[job_id]["result"] = result
        logger.info("job_completed job_id=%s", job_id)
    except Exception as exc:
        with _lock:
            _jobs[job_id]["status"] = "failed"
            _jobs[job_id]["error"] = {
                "type": exc.__class__.__name__,
                "message": str(exc),
            }
        logger.exception("job_failed job_id=%s", job_id)


def submit(fn: Callable, *args: Any, **kwargs: Any) -> str:
    """Submit *fn* to the worker pool and return a new job_id."""
    job_id = str(uuid.uuid4())
    with _lock:
        _jobs[job_id] = {"status": "pending", "result": None, "error": None}
    logger.info("job_submitted job_id=%s", job_id)
    _executor.submit(_run, job_id, fn, args, kwargs)
    return job_id


def get_job(job_id: str) -> Optional[dict]:
    """Return the job record or None if unknown."""
    with _lock:
        entry = _jobs.get(job_id)
        return dict(entry) if entry is not None else None
