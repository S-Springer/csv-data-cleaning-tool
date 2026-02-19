from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import pandas as pd
import numpy as np
import io
from typing import Optional, Any, Dict, List
from sqlalchemy.orm import Session
from app.services.cleaner import DataCleaner, convert_numpy_types
from app.services.analyzer import DataAnalyzer
from app.core.database import get_db
from app.core.security import get_optional_user
from app.models import FileRecord, User

router = APIRouter(prefix="/api/data", tags=["data"])

# Store uploaded dataframes in memory (for demo; use database in production)
uploaded_data = {}
# Track cleaning iteration count for unique file IDs
clean_counters = {}


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


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Upload and parse a CSV file"""
    try:
        print(f"Received file: {file.filename}, content_type: {file.content_type}")
        
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
        contents = await file.read()
        print(f"File size: {len(contents)} bytes")
        
        # Try multiple encodings to handle different CSV file formats
        encodings_to_try = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252', 'utf-16']
        df = None
        last_error = None
        
        for encoding in encodings_to_try:
            try:
                df = pd.read_csv(io.BytesIO(contents), encoding=encoding)
                print(f"Successfully loaded with {encoding} encoding, shape: {df.shape}")
                break
            except (UnicodeDecodeError, Exception) as e:
                last_error = e
                continue
        
        if df is None:
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to decode CSV file. Tried encodings: {', '.join(encodings_to_try)}. Error: {str(last_error)}"
            )
        
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
async def upload_file_batch(
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
def preview_data(file_id: str, rows: int = 5):
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
    
    # Aggressively handle NaN/Inf values before JSON serialization
    preview_df = preview_df.fillna(value=None)  # Replace NaN with None
    preview_df = preview_df.replace([np.inf, -np.inf], None)  # Replace infinity with None
    
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
def analyze_data(file_id: str):
    """Analyze uploaded data"""
    if file_id not in uploaded_data:
        raise HTTPException(status_code=404, detail="File not found")
    
    df = uploaded_data[file_id]
    
    response = {
        "file_id": file_id,
        "basic_stats": DataAnalyzer.get_basic_stats(df),
        "column_stats": DataAnalyzer.get_column_stats(df),
        "quality_score": DataAnalyzer.get_data_quality_score(df),
        "missing_values": DataCleaner.detect_missing_values(df),
        "duplicates": DataCleaner.detect_duplicates(df)
    }
    
    # Ensure all numpy types are converted to JSON-serializable Python types
    return convert_numpy_types(response)


@router.post("/clean/{file_id}")
def clean_data(
    file_id: str,
    request: CleanDataRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Apply cleaning operations to data in specific order"""
    if file_id not in uploaded_data:
        raise HTTPException(status_code=404, detail="File not found")
    
    df = uploaded_data[file_id].copy()
    
    operations = []
    
    # Step 1: Choose which columns to keep (drop unwanted columns first)
    if request.columns_to_drop and len(request.columns_to_drop) > 0:
        original_cols = len(df.columns)
        df = DataCleaner.drop_columns(df, request.columns_to_drop)
        dropped_count = original_cols - len(df.columns)
        operations.append(f"Dropped {dropped_count} column(s)")
    
    # Step 2: Handle missing values
    if request.fill_missing:
        df = DataCleaner.fill_missing_values(df, strategy=request.fill_missing)
        operations.append(f"Filled missing values ({request.fill_missing})")
    
    # Step 3: Clean string values
    if request.clean_strings:
        df, updated_cells = DataCleaner.clean_string_values(df)
        operations.append(f"Cleaned string values ({updated_cells} cell(s) normalized)")

    # Step 4: Standardize numeric data
    if request.standardize_data:
        df, standardized_columns = DataCleaner.standardize_numeric_data(df, method=request.standardize_data)
        operations.append(f"Standardized numeric data ({request.standardize_data}, {standardized_columns} column(s))")

    # Step 5: Remove duplicates
    if request.remove_duplicates:
        df = DataCleaner.remove_duplicates(df)
        operations.append("Removed duplicates")
    
    # Step 6: Remove outliers (optional, after other operations)
    if request.remove_outliers:
        original_rows = len(df)
        df = DataCleaner.remove_outliers(df)
        operations.append(f"Removed outliers ({original_rows - len(df)} rows removed)")
    
    # Generate unique cleaned ID using counter (allows multiple clean operations)
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
        owner_id=(source_record.owner_id if source_record else (current_user.id if current_user else None)),
        is_cleaned=True,
        parent_file_id=file_id
    )
    
    return {
        "original_file_id": file_id,
        "cleaned_file_id": cleaned_id,
        "operations": operations,
        "stats": DataAnalyzer.get_basic_stats(df),
        "quality_score": DataAnalyzer.get_data_quality_score(df)
    }


@router.get("/download/{file_id}")
def download_data(file_id: str):
    """Download processed data as CSV"""
    if file_id not in uploaded_data:
        raise HTTPException(status_code=404, detail="File not found")
    
    df = uploaded_data[file_id]
    csv_content = df.to_csv(index=False)
    
    return {
        "file_id": file_id,
        "csv": csv_content,
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

    db.delete(record)
    db.commit()

    return {"status": "success", "message": f"Deleted file {file_id}"}
