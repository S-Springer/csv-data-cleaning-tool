import pandas as pd
import numpy as np
from typing import Dict, Any


def convert_numpy_types(obj):
    """Recursively convert numpy types to Python native types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(val) for key, val in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    return obj


class DataAnalyzer:
    """Handles data analysis and profiling"""
    
    @staticmethod
    def get_basic_stats(df: pd.DataFrame) -> Dict[str, Any]:
        """Get basic statistics for the dataset"""
        # Convert data_types dict to ensure native Python types
        dtypes_dict = {str(col): str(dtype) for col, dtype in df.dtypes.items()}
        
        stats = {
            "rows": int(len(df)),
            "columns": int(len(df.columns)),
            "memory_usage_mb": round(float(df.memory_usage(deep=True).sum() / 1024**2), 2),
            "column_names": [str(col) for col in df.columns],
            "data_types": dtypes_dict
        }
        return stats
    
    @staticmethod
    def get_column_stats(df: pd.DataFrame) -> Dict[str, Any]:
        """Get detailed statistics for each column"""
        stats = {}
        
        for col in df.columns:
            col_str = str(col)  # Ensure column name is a string, not numpy type
            col_stats = {
                "dtype": str(df[col].dtype),
                "non_null_count": int(df[col].notna().sum()),
                "null_count": int(df[col].isnull().sum()),
                "unique_values": int(df[col].nunique())
            }
            
            if df[col].dtype in [np.float64, np.int64, np.float32, np.int32]:
                try:
                    min_val = float(df[col].min())
                    max_val = float(df[col].max())
                    mean_val = float(df[col].mean())
                    median_val = float(df[col].median())
                    std_val = float(df[col].std())
                    
                    col_stats.update({
                        "min": min_val if not (np.isnan(min_val) or np.isinf(min_val)) else None,
                        "max": max_val if not (np.isnan(max_val) or np.isinf(max_val)) else None,
                        "mean": mean_val if not (np.isnan(mean_val) or np.isinf(mean_val)) else None,
                        "median": median_val if not (np.isnan(median_val) or np.isinf(median_val)) else None,
                        "std": std_val if not (np.isnan(std_val) or np.isinf(std_val)) else None
                    })
                except:
                    col_stats.update({"min": None, "max": None, "mean": None, "median": None, "std": None})
            else:
                mode_vals = df[col].mode()
                col_stats["most_common"] = str(mode_vals[0]) if len(mode_vals) > 0 else None
            
            stats[col_str] = col_stats
        
        return stats
    
    @staticmethod
    def get_data_quality_score(df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate overall data quality score"""
        total_cells = len(df) * len(df.columns)
        missing_cells = df.isnull().sum().sum()
        duplicate_rows = df.duplicated().sum()
        
        # Quality score based on completeness and uniqueness
        completeness = ((total_cells - missing_cells) / total_cells) * 100
        uniqueness = ((len(df) - duplicate_rows) / len(df)) * 100
        quality_score = (completeness + uniqueness) / 2
        
        result = {
            "overall_score": round(quality_score, 2),
            "completeness": round(completeness, 2),
            "uniqueness": round(uniqueness, 2),
            "issues": {
                "missing_values": int(missing_cells),
                "duplicate_rows": int(duplicate_rows)
            }
        }
        return convert_numpy_types(result)
    
    @staticmethod
    def get_correlation_matrix(df: pd.DataFrame) -> Dict[str, Any]:
        """Get correlation matrix for numeric columns"""
        numeric_df = df.select_dtypes(include=[np.number])
        
        if len(numeric_df.columns) == 0:
            return {"error": "No numeric columns found"}
        
        corr_matrix = numeric_df.corr().round(3)
        
        # Manually build correlation matrix dict with native Python types
        corr_dict = {}
        for col in corr_matrix.columns:
            corr_dict[str(col)] = {str(idx): float(val) if not (isinstance(val, float) and (np.isnan(val) or np.isinf(val))) else None 
                                   for idx, val in corr_matrix[col].items()}
        
        result = {
            "columns": [str(col) for col in numeric_df.columns],
            "correlation_matrix": corr_dict
        }
        return result
