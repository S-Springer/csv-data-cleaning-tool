from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from starlette.requests import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import pandas as pd
import numpy as np
import io
import base64
import hashlib
import threading
import logging
from typing import Optional, Any, Dict, List
from sqlalchemy.orm import Session
from app.core.rate_limit import limiter
from app.core.cache import get_cached, set_cached, invalidate_file_cache
from app.core import jobs
from app.services.cleaner import DataCleaner, convert_numpy_types
from app.services.analyzer import DataAnalyzer
from app.services.ai_assistant import AIAssistant
from app.core.database import get_db
from app.core.security import get_optional_user
from app.models import FileRecord, User

router = APIRouter(prefix="/api/data", tags=["data"])
logger = logging.getLogger(__name__)

ANALYZE_CACHE_TTL = 300
STATS_CACHE_TTL = 300
AI_CACHE_TTL = 900

# Lock to make clean_counter increments thread-safe for async jobs.
_clean_counter_lock = threading.Lock()

# Store uploaded dataframes in memory (for demo; use database in production)
uploaded_data = {}
# Track cleaning iteration count for unique file IDs
clean_counters = {}


def _parse_uploaded_file(file_name: str, contents: bytes) -> pd.DataFrame:
    """Parse uploaded tabular files (.csv, .xlsx, .json) with safe fallbacks."""
    lower_name = file_name.lower()

    if lower_name.endswith('.csv'):
        encodings_to_try = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252', 'utf-16']
        last_error = None
        for encoding in encodings_to_try:
            try:
                return pd.read_csv(io.BytesIO(contents), encoding=encoding)
            except (UnicodeDecodeError, Exception) as e:
                last_error = e
        raise HTTPException(
            status_code=400,
            detail=f"Failed to decode CSV file. Tried encodings: {', '.join(encodings_to_try)}. Error: {str(last_error)}",
        )

    if lower_name.endswith('.xlsx'):
        try:
            return pd.read_excel(io.BytesIO(contents))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse Excel file: {str(e)}")

    if lower_name.endswith('.json'):
        try:
            # Support both record arrays and JSON-lines payloads.
            try:
                return pd.read_json(io.BytesIO(contents))
            except ValueError:
                return pd.read_json(io.BytesIO(contents), lines=True)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse JSON file: {str(e)}")

    raise HTTPException(status_code=400, detail="Only CSV, XLSX, and JSON files are supported")


def _generate_unique_file_id(base_name: str, db: Session) -> str:
    """Generate a unique file_id across memory + database records"""
    clean_base = base_name.replace('.csv', '')
    candidate = clean_base
    counter = 1

    while candidate in uploaded_data or db.query(FileRecord).filter(FileRecord.file_id == candidate).first():
        candidate = f"{clean_base}_{counter}"
        counter += 1

    return candidate


def _upsert_file_record(
    db: Session,
    file_id: str,
    original_filename: str,
    rows: int,
    columns: int,
    owner_id: Optional[int] = None,
    is_cleaned: bool = False,
    parent_file_id: Optional[str] = None
):
    record = db.query(FileRecord).filter(FileRecord.file_id == file_id).first()
    if not record:
        record = FileRecord(
            file_id=file_id,
            original_filename=original_filename,
            owner_id=owner_id,
            rows=rows,
            columns=columns,
            is_cleaned=is_cleaned,
            parent_file_id=parent_file_id
        )
        db.add(record)
    else:
        record.rows = rows
        record.columns = columns
        record.owner_id = owner_id
        record.is_cleaned = is_cleaned
        record.parent_file_id = parent_file_id

    db.commit()


# Pydantic model for clean data request
class CleanDataRequest(BaseModel):
    remove_duplicates: bool = False
    fill_missing: Optional[str] = None
    clean_strings: bool = False
    standardize_data: Optional[str] = None
    remove_outliers: bool = False
    columns_to_drop: Optional[List[str]] = None


class AIInsightRequest(BaseModel):
    question: Optional[str] = None


def _do_clean(file_id: str, request: CleanDataRequest, owner_id: Optional[int]) -> dict:
    """Core cleaning logic — safe to run in a background thread.

    Creates its own DB session so it can be submitted to the job queue without
    sharing the request-scoped SQLAlchemy session.
    """
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        if file_id not in uploaded_data:
            raise ValueError(f"File {file_id!r} not found in memory")

        df = uploaded_data[file_id].copy()
        operations = []

        if request.columns_to_drop and len(request.columns_to_drop) > 0:
            original_cols = len(df.columns)
            df = DataCleaner.drop_columns(df, request.columns_to_drop)
            operations.append(f"Dropped {original_cols - len(df.columns)} column(s)")

        if request.fill_missing:
            df = DataCleaner.fill_missing_values(df, strategy=request.fill_missing)
            operations.append(f"Filled missing values ({request.fill_missing})")

        if request.clean_strings:
            df, updated_cells = DataCleaner.clean_string_values(df)
            operations.append(f"Cleaned string values ({updated_cells} cell(s) normalized)")

        if request.standardize_data:
            df, standardized_columns = DataCleaner.standardize_numeric_data(df, method=request.standardize_data)
            operations.append(f"Standardized numeric data ({request.standardize_data}, {standardized_columns} column(s))")

        if request.remove_duplicates:
            df = DataCleaner.remove_duplicates(df)
            operations.append("Removed duplicates")

        if request.remove_outliers:
            original_rows = len(df)
            df = DataCleaner.remove_outliers(df)
            operations.append(f"Removed outliers ({original_rows - len(df)} rows removed)")

        with _clean_counter_lock:
            if file_id not in clean_counters:
                clean_counters[file_id] = 0
            clean_counters[file_id] += 1
            cleaned_id = f"{file_id}_cleaned_{clean_counters[file_id]}"

        uploaded_data[cleaned_id] = df

        source_record = db.query(FileRecord).filter(FileRecord.file_id == file_id).first()
        _upsert_file_record(
            db=db,
            file_id=cleaned_id,
            original_filename=(source_record.original_filename if source_record else f"{file_id}.csv"),
            rows=int(len(df)),
            columns=int(len(df.columns)),
            owner_id=(source_record.owner_id if source_record else owner_id),
            is_cleaned=True,
            parent_file_id=file_id,
        )

        # Source-file analysis/AI caches become stale after generating a new cleaned variant.
        invalidate_file_cache(file_id)
        logger.info("cache_invalidate file_id=%s reason=clean_completed", file_id)

        return {
            "original_file_id": file_id,
            "cleaned_file_id": cleaned_id,
            "operations": operations,
            "stats": DataAnalyzer.get_basic_stats(df),
            "quality_score": DataAnalyzer.get_data_quality_score(df),
        }
    finally:
        db.close()


def _do_ai_insights(file_id: str, question: Optional[str]) -> dict:
    """Core AI insights logic — safe to run in a background thread."""
    if file_id not in uploaded_data:
        raise ValueError(f"File {file_id!r} not found in memory")

    question_hash = hashlib.md5((question or "").encode()).hexdigest()[:8]
    cache_key = f"tidycsv:{file_id}:ai:{question_hash}"

    df = uploaded_data[file_id]
    analysis = {
        "basic_stats": DataAnalyzer.get_basic_stats(df),
        "quality_score": DataAnalyzer.get_data_quality_score(df),
        "missing_values": DataCleaner.detect_missing_values(df),
        "duplicates": DataCleaner.detect_duplicates(df),
    }
    result = AIAssistant.generate_insights(
        file_id=file_id,
        df=df,
        analysis=analysis,
        question=question,
    )
    result = convert_numpy_types(result)
    set_cached(cache_key, result, ttl=AI_CACHE_TTL)
    return result


@router.post("/upload")
@limiter.limit("20/minute")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Upload and parse a CSV file"""
    try:
        print(f"Received file: {file.filename}, content_type: {file.content_type}")
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="File name is required")

        allowed_extensions = ('.csv', '.xlsx', '.json')
        if not file.filename.lower().endswith(allowed_extensions):
            raise HTTPException(status_code=400, detail="Only CSV, XLSX, and JSON files are supported")
        
        contents = await file.read()
        print(f"File size: {len(contents)} bytes")
        
        df = _parse_uploaded_file(file.filename, contents)
        print(f"Successfully loaded file, shape: {df.shape}")
        
        file_id = _generate_unique_file_id(file.filename, db)
        uploaded_data[file_id] = df

        _upsert_file_record(
            db=db,
            file_id=file_id,
            original_filename=file.filename,
            rows=int(len(df)),
            columns=int(len(df.columns)),
            owner_id=current_user.id if current_user else None,
            is_cleaned=False,
            parent_file_id=None
        )
        
        basic_stats = DataAnalyzer.get_basic_stats(df)
        
        return {
            "file_id": file_id,
            "status": "success",
            "message": f"File uploaded: {file.filename}",
            "stats": basic_stats
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading file: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upload/batch")
@limiter.limit("20/minute")
async def upload_file_batch(
    request: Request,
    file: UploadFile = File(...),
    chunk_size: int = 100000,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Upload and process CSV in chunks for large-file workflows"""
    try:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are supported")

        contents = await file.read()
        encodings_to_try = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252', 'utf-16']

        chunks = []
        processed_chunks = 0
        total_rows = 0
        detected_encoding = None
        last_error = None

        for encoding in encodings_to_try:
            try:
                chunk_iter = pd.read_csv(io.BytesIO(contents), encoding=encoding, chunksize=chunk_size)
                chunks = []
                processed_chunks = 0
                total_rows = 0

                for chunk in chunk_iter:
                    chunks.append(chunk)
                    processed_chunks += 1
                    total_rows += len(chunk)

                detected_encoding = encoding
                break
            except Exception as e:
                last_error = e
                continue

        if not chunks:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to process CSV in batches. Error: {str(last_error)}"
            )

        df = pd.concat(chunks, ignore_index=True)

        file_id = _generate_unique_file_id(file.filename, db)
        uploaded_data[file_id] = df

        _upsert_file_record(
            db=db,
            file_id=file_id,
            original_filename=file.filename,
            rows=int(len(df)),
            columns=int(len(df.columns)),
            owner_id=current_user.id if current_user else None,
            is_cleaned=False,
            parent_file_id=None
        )

        return {
            "file_id": file_id,
            "status": "success",
            "message": f"Batch upload complete for {file.filename}",
            "batch_info": {
                "chunk_size": chunk_size,
                "processed_chunks": processed_chunks,
                "detected_encoding": detected_encoding,
                "total_rows": total_rows
            },
            "stats": DataAnalyzer.get_basic_stats(df)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/preview/{file_id}")
@limiter.limit("120/minute")
def preview_data(request: Request, file_id: str, rows: int = 5):
    """Get preview of data (first N rows or sampled for large datasets)"""
    if file_id not in uploaded_data:
        raise HTTPException(status_code=404, detail="File not found")
    
    df = uploaded_data[file_id]
    is_sampled = False
    
    # For large datasets, sample instead of converting all rows to dict (prevents JSON serialization errors)
    if len(df) > 10000:
        preview_df = df.sample(n=min(rows, len(df)), random_state=42, ignore_index=True)
        is_sampled = True
    else:
        preview_df = df.head(rows)
    
    # Replace NaN/Inf in a pandas-safe way before JSON serialization.
    preview_df = preview_df.replace([np.inf, -np.inf], np.nan)
    preview_df = preview_df.astype(object).where(pd.notna(preview_df), None)
    
    # Convert to dict and manually ensure all values are JSON-serializable
    preview_dict = preview_df.to_dict(orient='records')
    
    # Final pass: ensure no NaN/Inf in the dict (handles edge cases)
    for record in preview_dict:
        for key, value in record.items():
            if isinstance(value, float) and (np.isnan(value) or np.isinf(value)):
                record[key] = None
    
    return {
        "file_id": file_id,
        "rows_shown": len(preview_df),
        "total_rows": len(df),
        "is_sampled": is_sampled,
        "columns": preview_df.columns.tolist(),
        "data": preview_dict
    }


@router.get("/analyze/{file_id}")
@limiter.limit("60/minute")
def analyze_data(request: Request, file_id: str):
    """Analyze uploaded data"""
    if file_id not in uploaded_data:
        raise HTTPException(status_code=404, detail="File not found")

    cache_key = f"tidycsv:{file_id}:analyze"
    cached = get_cached(cache_key)
    if cached is not None:
        logger.info("cache_hit endpoint=analyze file_id=%s", file_id)
        if isinstance(cached, dict):
            cached = dict(cached)
            cached["served_from_cache"] = True
        return cached

    logger.info("cache_miss endpoint=analyze file_id=%s", file_id)

    df = uploaded_data[file_id]

    response = {
        "file_id": file_id,
        "basic_stats": DataAnalyzer.get_basic_stats(df),
        "column_stats": DataAnalyzer.get_column_stats(df),
        "correlation_matrix": DataAnalyzer.get_correlation_matrix(df),
        "quality_score": DataAnalyzer.get_data_quality_score(df),
        "missing_values": DataCleaner.detect_missing_values(df),
        "duplicates": DataCleaner.detect_duplicates(df)
    }

    result = convert_numpy_types(response)
    result["served_from_cache"] = False
    set_cached(cache_key, result, ttl=ANALYZE_CACHE_TTL)
    return result


@router.get("/stats/{file_id}")
@limiter.limit("60/minute")
def get_advanced_stats(request: Request, file_id: str):
    """Get advanced numeric distribution stats for the uploaded dataset."""
    if file_id not in uploaded_data:
        raise HTTPException(status_code=404, detail="File not found")

    cache_key = f"tidycsv:{file_id}:stats"
    cached = get_cached(cache_key)
    if cached is not None:
        logger.info("cache_hit endpoint=stats file_id=%s", file_id)
        if isinstance(cached, dict):
            cached = dict(cached)
            cached["served_from_cache"] = True
        return cached

    logger.info("cache_miss endpoint=stats file_id=%s", file_id)

    df = uploaded_data[file_id]
    response = {
        "file_id": file_id,
        "advanced_stats": DataAnalyzer.get_advanced_stats(df),
    }
    result = convert_numpy_types(response)
    result["served_from_cache"] = False
    set_cached(cache_key, result, ttl=STATS_CACHE_TTL)
    return result


@router.post("/ai/insights/{file_id}")
@limiter.limit("15/minute")
def generate_ai_insights(request: Request, file_id: str, payload: AIInsightRequest, run_async: bool = False):
    """Generate AI-powered recommendations for uploaded data."""
    if file_id not in uploaded_data:
        raise HTTPException(status_code=404, detail="File not found")

    if run_async:
        logger.info("job_submitted type=ai_insights file_id=%s", file_id)
        job_id = jobs.submit(_do_ai_insights, file_id, payload.question)
        return {"job_id": job_id, "status": "pending", "message": "AI insights job submitted"}

    question_hash = hashlib.md5((payload.question or "").encode()).hexdigest()[:8]
    cache_key = f"tidycsv:{file_id}:ai:{question_hash}"
    cached = get_cached(cache_key)
    if cached is not None:
        logger.info("cache_hit endpoint=ai_insights file_id=%s", file_id)
        if isinstance(cached, dict):
            cached = dict(cached)
            cached["served_from_cache"] = True
        return cached

    logger.info("cache_miss endpoint=ai_insights file_id=%s", file_id)

    result = _do_ai_insights(file_id, payload.question)
    result["served_from_cache"] = False
    return result


@router.post("/clean/{file_id}")
def clean_data(
    file_id: str,
    request: CleanDataRequest,
    run_async: bool = False,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Apply cleaning operations to data in specific order.

    Pass ?run_async=true to submit as a background job and receive a job_id
    for polling via GET /api/jobs/{job_id}.
    """
    if file_id not in uploaded_data:
        raise HTTPException(status_code=404, detail="File not found")

    if run_async:
        owner_id = current_user.id if current_user else None
        logger.info("job_submitted type=clean file_id=%s", file_id)
        job_id = jobs.submit(_do_clean, file_id, request, owner_id)
        return {"job_id": job_id, "status": "pending", "message": "Cleaning job submitted"}

    return _do_clean(file_id, request, current_user.id if current_user else None)


@router.get("/download/{file_id}")
def download_data(file_id: str, format: str = "csv"):
    """Download processed data as CSV, JSON, or XLSX."""
    if file_id not in uploaded_data:
        raise HTTPException(status_code=404, detail="File not found")

    df = uploaded_data[file_id]

    export_format = (format or "csv").lower()
    if export_format not in ("csv", "json", "xlsx"):
        raise HTTPException(status_code=400, detail="Supported formats: csv, json, xlsx")

    if export_format == "csv":
        content = df.to_csv(index=False)
        encoding = "utf-8"
        mime_type = "text/csv"
    elif export_format == "json":
        content = df.to_json(orient='records', indent=2)
        encoding = "utf-8"
        mime_type = "application/json"
    else:
        excel_buffer = io.BytesIO()
        df.to_excel(excel_buffer, index=False)
        content = base64.b64encode(excel_buffer.getvalue()).decode('ascii')
        encoding = "base64"
        mime_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    return {
        "file_id": file_id,
        "format": export_format,
        "encoding": encoding,
        "mime_type": mime_type,
        "content": content,
        "rows": len(df),
        "columns": len(df.columns)
    }


@router.get("/files")
def list_files(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """List tracked files (all anonymous files or only current user's files)"""
    query = db.query(FileRecord)
    if current_user:
        query = query.filter(FileRecord.owner_id == current_user.id)

    records = query.order_by(FileRecord.created_at.desc()).all()

    return {
        "files": [
            {
                "file_id": record.file_id,
                "original_filename": record.original_filename,
                "rows": record.rows,
                "columns": record.columns,
                "is_cleaned": record.is_cleaned,
                "parent_file_id": record.parent_file_id,
                "created_at": record.created_at.isoformat() if record.created_at else None
            }
            for record in records
        ]
    }


@router.delete("/files/{file_id}")
def delete_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Delete file from memory and metadata store"""
    record = db.query(FileRecord).filter(FileRecord.file_id == file_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    if record.owner_id is not None:
        if not current_user or current_user.id != record.owner_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this file")

    if file_id in uploaded_data:
        del uploaded_data[file_id]

    invalidate_file_cache(file_id)

    db.delete(record)
    db.commit()

    return {"status": "success", "message": f"Deleted file {file_id}"}
