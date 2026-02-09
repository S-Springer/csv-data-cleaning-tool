from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.data_routes import router as data_router
import numpy as np

app = FastAPI(
    title="CSV Data Cleaning & Analysis Tool",
    description="A tool for cleaning and analyzing CSV data",
    version="0.1.0",
    json_encoders={np.floating: lambda v: None if (np.isnan(v) or np.isinf(v)) else float(v)}
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(data_router)


@app.get("/")
def read_root():
    return {
        "message": "CSV Data Cleaning & Analysis Tool API",
        "version": "0.1.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
