from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import pandas as pd
import numpy as np
import io
from typing import Optional, Any, Dict, List
from app.services.cleaner import DataCleaner, convert_numpy_types
from app.services.analyzer import DataAnalyzer

router = APIRouter(prefix="/api/data", tags=["data"])

# Store uploaded dataframes in memory (for demo; use database in production)
uploaded_data = {}
# Track cleaning iteration count for unique file IDs
clean_counters = {}


# Pydantic model for clean data request
class CleanDataRequest(BaseModel):
    remove_duplicates: bool = False
    fill_missing: Optional[str] = None
    remove_outliers: bool = False
    columns_to_drop: Optional[List[str]] = None


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
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
        
        file_id = file.filename.replace('.csv', '')
        uploaded_data[file_id] = df
        
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
def clean_data(file_id: str, request: CleanDataRequest):
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
    
    # Step 3: Remove duplicates
    if request.remove_duplicates:
        df = DataCleaner.remove_duplicates(df)
        operations.append("Removed duplicates")
    
    # Step 4: Remove outliers (optional, after other operations)
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
