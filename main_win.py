import sys
import os
import threading
import time
from pathlib import Path
import uvicorn
# Import FastAPI and other backend dependencies so PyInstaller detects them
import fastapi
import fastapi.middleware
import fastapi.middleware.cors
import fastapi.staticfiles
import pandas
import numpy
import pydantic
import starlette

def base_path():
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)
    return Path(__file__).parent

# Ensure project root is on path
sys.path.insert(0, str(base_path()))

def start_server():
    # Allow overriding static dir when packaging
    static_dir = base_path() / 'frontend' / 'build'
    os.environ.setdefault('STATIC_DIR', str(static_dir))
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, log_level="info")

if __name__ == '__main__':
    t = threading.Thread(target=start_server, daemon=True)
    t.start()
    # wait for server to start
    time.sleep(1.0)

    try:
        import webview
        webview.create_window("CSV Data Cleaning & Analysis Tool", "http://127.0.0.1:8000")
        webview.start()
    except Exception:
        # fallback: open in default browser
        import webbrowser
        webbrowser.open("http://127.0.0.1:8000")
        # keep process alive while server thread runs
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
