import pandas as pd
import numpy as np
import math
from typing import Dict, List, Any


def convert_numpy_types(obj):
    """Recursively convert numpy types to Python native types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, float):
        # Handle regular Python float NaN/Inf
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(val) for key, val in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    return obj


class DataCleaner:
    """Handles data cleaning operations"""
    
    @staticmethod
    def detect_missing_values(df: pd.DataFrame) -> Dict[str, Any]:
        """Detect missing values in dataframe"""
        missing = df.isnull().sum()
        missing_percent = (missing / len(df) * 100).round(2)
        
        # Convert to native Python types
        missing_dict = {str(col): int(missing[col]) for col in missing.index if missing[col] > 0}
        percent_dict = {str(col): float(missing_percent[col]) for col in missing_percent.index if missing[col] > 0}
        
        result = {
            "columns": missing_dict,
            "percentages": percent_dict,
            "total_missing": int(missing.sum()),
            "total_cells": int(len(df) * len(df.columns))
        }
        return result
    
    @staticmethod
    def detect_duplicates(df: pd.DataFrame) -> Dict[str, Any]:
        """Detect duplicate rows"""
        total_duplicates = df.duplicated().sum()
        
        return {
            "total_duplicates": int(total_duplicates),
            "percentage": round(total_duplicates / len(df) * 100, 2),
            "remaining_rows": len(df) - total_duplicates
        }
    
    @staticmethod
    def remove_duplicates(df: pd.DataFrame) -> pd.DataFrame:
        """Remove duplicate rows"""
        return df.drop_duplicates()
    
    @staticmethod
    def fill_missing_values(df: pd.DataFrame, strategy: str = "mean") -> pd.DataFrame:
        """
        Fill missing values
        strategy: 'mean', 'median', 'forward_fill', 'drop', 'empty_string'
        """
        df = df.copy()
        
        for col in df.columns:
            if df[col].isnull().sum() > 0:
                if strategy == "mean" and df[col].dtype in [np.float64, np.int64]:
                    df[col].fillna(df[col].mean(), inplace=True)
                elif strategy == "median" and df[col].dtype in [np.float64, np.int64]:
                    df[col].fillna(df[col].median(), inplace=True)
                elif strategy == "forward_fill":
                    df[col] = df[col].ffill()
                elif strategy == "empty_string":
                    df[col].fillna('', inplace=True)
                elif strategy == "drop":
                    df = df.dropna(subset=[col])
        
        return df
    
    @staticmethod
    def remove_outliers(df: pd.DataFrame, method: str = "iqr") -> pd.DataFrame:
        """Remove outliers using IQR method"""
        df = df.copy()
        
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_columns:
            if method == "iqr":
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                df = df[(df[col] >= lower_bound) & (df[col] <= upper_bound)]
        
        return df
    
    @staticmethod
    def drop_columns(df: pd.DataFrame, columns: List[str]) -> pd.DataFrame:
        """Drop specified columns from dataframe"""
        df = df.copy()
        
        # Only drop columns that exist in the dataframe
        columns_to_drop = [col for col in columns if col in df.columns]
        
        if columns_to_drop:
            df = df.drop(columns=columns_to_drop)
        
        return df
