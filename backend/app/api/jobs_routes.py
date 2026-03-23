"""
Job status polling endpoint.

GET /api/jobs/{job_id}
    Returns the current status and result for a background job submitted via
    POST /api/data/clean/{file_id}?run_async=true
    POST /api/data/ai/insights/{file_id}?run_async=true
"""

from fastapi import APIRouter, HTTPException
from app.core.jobs import get_job

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("/{job_id}")
def get_job_status(job_id: str):
    """Poll the status/result of an async background job."""
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job_id": job_id, **job}
