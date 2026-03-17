from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler
from app.api.data_routes import router as data_router
from app.api.auth_routes import router as auth_router
from app.core.database import engine, Base
from app.core.rate_limit import limiter
import numpy as np
import os

app = FastAPI(
    title="TidyCSV",
    description="TidyCSV: AI-assisted CSV cleaning and analysis",
    version="0.1.0",
    json_encoders={np.floating: lambda v: None if (np.isnan(v) or np.isinf(v)) else float(v)}
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

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
app.include_router(auth_router)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# Mount built frontend LAST (so it doesn't catch API routes)
static_dir = os.environ.get("STATIC_DIR") or os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'frontend', 'build')
static_dir = os.path.abspath(static_dir)
if os.path.isdir(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
