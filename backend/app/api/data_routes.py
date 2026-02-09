from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import io
from typing import Optional, Any, Dict
from app.services.cleaner import DataCleaner, convert_numpy_types
from app.services.analyzer import DataAnalyzer

router = APIRouter(prefix="/api/data", tags=["data"])

# Store uploaded dataframes in memory (for demo; use database in production)
uploaded_data = {}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and parse a CSV file"""
    try:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        file_id = file.filename.replace('.csv', '')
        uploaded_data[file_id] = df
        
        basic_stats = DataAnalyzer.get_basic_stats(df)
        
        return {
            "file_id": file_id,
            "status": "success",
            "message": f"File uploaded: {file.filename}",
            "stats": basic_stats
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/preview/{file_id}")
def preview_data(file_id: str, rows: int = 5):
    """Get preview of data (first N rows)"""
    if file_id not in uploaded_data:
        raise HTTPException(status_code=404, detail="File not found")
    
    df = uploaded_data[file_id]
    preview_df = df.head(rows)
    
    return {
        "file_id": file_id,
        "rows_shown": len(preview_df),
        "total_rows": len(df),
        "columns": preview_df.columns.tolist(),
        "data": preview_df.to_dict(orient='records')
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
    remove_duplicates: bool = False,
    fill_missing: Optional[str] = None,
    remove_outliers: bool = False
):
    """Apply cleaning operations to data"""
    if file_id not in uploaded_data:
        raise HTTPException(status_code=404, detail="File not found")
    
    df = uploaded_data[file_id].copy()
    
    operations = []
    
    if remove_duplicates:
        df = DataCleaner.remove_duplicates(df)
        operations.append("Removed duplicates")
    
    if fill_missing:
        df = DataCleaner.fill_missing_values(df, strategy=fill_missing)
        operations.append(f"Filled missing values ({fill_missing})")
    
    if remove_outliers:
        original_rows = len(df)
        df = DataCleaner.remove_outliers(df)
        operations.append(f"Removed outliers ({original_rows - len(df)} rows removed)")
    
    # Save cleaned data
    cleaned_id = f"{file_id}_cleaned"
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
