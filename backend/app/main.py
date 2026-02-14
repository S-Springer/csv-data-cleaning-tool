from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.data_routes import router as data_router
import numpy as np
import os

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

# Include API routers FIRST (before static files)
app.include_router(data_router)


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# Mount built frontend LAST (so it doesn't catch API routes)
static_dir = os.environ.get("STATIC_DIR") or os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'frontend', 'build')
static_dir = os.path.abspath(static_dir)
if os.path.isdir(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
