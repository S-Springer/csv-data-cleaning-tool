# CSV Data Cleaning & Analysis Tool - Development Guide

This workspace contains a full-stack application for data cleaning and analysis.

## Project Overview

- **Backend**: Python FastAPI application with data processing services
- **Frontend**: React application with modern UI components
- **Purpose**: Simple yet scalable data cleaning tool for Data Engineers and AI Engineers

## Workspace Structure

```
test_application/
├── backend/              # FastAPI backend
├── frontend/             # React frontend
└── README.md            # Full documentation
```

## Quick Start

### 1. Start Backend
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start Frontend (in another terminal)
```bash
cd frontend
npm install
npm start
```

Visit `http://localhost:3000` in your browser.

## Key Files to Know

### Backend
- `backend/app/main.py` - FastAPI application setup
- `backend/app/api/data_routes.py` - API endpoints
- `backend/app/services/cleaner.py` - Data cleaning logic
- `backend/app/services/analyzer.py` - Data analysis logic

### Frontend
- `frontend/src/App.js` - Main React component
- `frontend/src/components/FileUpload.js` - File upload interface
- `frontend/src/components/DataAnalysis.js` - Analysis display
- `frontend/src/components/DataCleaner.js` - Cleaning interface
- `frontend/src/services/api.js` - API client

## Development Tasks

### For Backend Development
- Add new cleaning algorithms in `cleaner.py`
- Add new analysis methods in `analyzer.py`
- Create additional routes in `app/api/`

### For Frontend Development
- Add new components in `src/components/`
- Enhance styling with CSS modules
- Add data visualization with Recharts

### To Scale the Project
1. Add database integration (PostgreSQL)
2. Implement user authentication
3. Add job queues for async processing
4. Deploy to cloud platform

## API Documentation

Once backend is running, visit: `http://localhost:8000/docs`

## Common Commands

```bash
# Backend - Install packages
pip install -r requirements.txt

# Backend - Run with auto-reload
uvicorn app.main:app --reload

# Frontend - Install packages
npm install

# Frontend - Start dev server
npm start

# Frontend - Build for production
npm run build
```

## Environment Variables

Create `.env` file in backend folder if needed for configuration.

## Next Steps

1. Familiarize yourself with the existing code structure
2. Test the application end-to-end
3. Plan your enhancements
4. Follow the development tips in README.md
