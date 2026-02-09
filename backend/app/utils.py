import numpy as np
from typing import Any, Dict


def clean_nan_inf(obj: Any) -> Any:
    """
    Recursively clean NaN and inf values from an object.
    Converts NaN/inf to None for JSON serialization.
    """
    if isinstance(obj, dict):
        return {key: clean_nan_inf(value) for key, value in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [clean_nan_inf(item) for item in obj]
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, (np.integer, int)):
        return int(obj)
    return obj
