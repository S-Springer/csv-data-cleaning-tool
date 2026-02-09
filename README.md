# CSV Data Cleaning & Analysis Tool

A full-stack application for Data Engineers and AI Engineers to clean, validate, and analyze CSV data. Simple to start with, scalable as your needs grow.

## Features

✨ **Data Upload**
- Drag-and-drop CSV file upload
- Automatic data parsing and basic statistics

📊 **Data Analysis**
- Dataset overview (rows, columns, memory usage)
- Column-level statistics
- Data quality scoring (completeness & uniqueness)
- Missing values detection
- Duplicate row detection

🧹 **Data Cleaning**
- Remove duplicate rows
- Fill missing values (mean, median, forward fill, or drop)
- Remove statistical outliers using IQR method
- Real-time quality score updates

⬇️ **Export**
- Download cleaned datasets as CSV

## Tech Stack

### Backend
- **Python 3.9+**
- **FastAPI** - Modern web framework
- **Pandas** - Data manipulation and analysis
- **NumPy** - Numerical computing

### Frontend
- **React 18** - UI framework
- **Axios** - HTTP client
- **CSS3** - Styling

## Project Structure

```
test_application/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── data_routes.py       # API endpoints
│   │   ├── services/
│   │   │   ├── cleaner.py           # Data cleaning logic
│   │   │   └── analyzer.py          # Data analysis logic
│   │   └── main.py                  # FastAPI app initialization
│   ├── requirements.txt              # Python dependencies
│   └── .gitignore
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── FileUpload.js        # File upload component
│   │   │   ├── DataAnalysis.js      # Analysis display component
│   │   │   └── DataCleaner.js       # Cleaning interface component
│   │   ├── services/
│   │   │   └── api.js               # API client
│   │   ├── App.js                   # Main app component
│   │   ├── App.css                  # App styling
│   │   └── index.js                 # React entry point
│   ├── package.json
│   └── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.9 or higher
- Node.js 16 or higher
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
```bash
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Start the FastAPI server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
- Interactive API docs: `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

## API Endpoints

### Upload File
**POST** `/api/data/upload`
- Upload a CSV file for processing
- Returns: file_id, basic statistics

### Analyze Data
**GET** `/api/data/analyze/{file_id}`
- Get comprehensive analysis of uploaded data
- Returns: basic stats, column stats, quality score, missing values, duplicates

### Clean Data
**POST** `/api/data/clean/{file_id}`
- Apply cleaning operations to data
- Parameters:
  - `remove_duplicates` (bool): Remove duplicate rows
  - `fill_missing` (string): Strategy for missing values ('mean', 'median', 'forward_fill', 'drop')
  - `remove_outliers` (bool): Remove statistical outliers
- Returns: Cleaned dataset info and quality metrics

### Download Data
**GET** `/api/data/download/{file_id}`
- Download processed data as CSV
- Returns: CSV content

## Usage Example

1. **Launch the app**: Open `http://localhost:3000` in your browser
2. **Upload CSV**: Drag and drop or click to upload a CSV file
3. **Review Analysis**: Check data quality metrics and issues
4. **Clean Data**: Select cleaning options and apply transformations
5. **Download**: Export the cleaned dataset

## Scalability Features

This project is designed to scale:

### Short-term (v0.2-v0.3)
- Database integration (PostgreSQL) for persistent storage
- User authentication and file management
- Batch processing for large files
- More statistical analysis options
- Data visualization with charts

### Medium-term (v0.4-v0.5)
- REST API optimization
- Caching layer (Redis)
- Job queue for async processing (Celery)
- Multiple file format support (Excel, JSON, Parquet)
- Workflow/pipeline scheduling

### Long-term (v1.0+)
- Microservices architecture
- Distributed processing (Apache Spark)
- Real-time monitoring dashboards
- ML-based data quality detection
- Cloud deployment (AWS, GCP, Azure)

## Development Tips

### Adding New Features

1. **Backend**: Add new services in `app/services/` and routes in `app/api/`
2. **Frontend**: Create new components in `src/components/` with corresponding CSS

### Testing

```bash
# Backend - create tests in backend/tests/
pytest

# Frontend - create tests in frontend/src/
npm test
```

### Troubleshooting

**CORS Issues**: Already configured in backend for development
**Port Conflicts**: Change ports in startup commands if needed

## Future Enhancements

- [ ] Database integration for persistent data storage
- [ ] User authentication and profiles
- [ ] Advanced statistical analysis
- [ ] Data visualization (charts, histograms)
- [ ] Workflow automation and scheduling
- [ ] Support for multiple file formats
- [ ] Real-time collaboration features
- [ ] API rate limiting and security

## Contributing

Feel free to extend this project! Areas for contribution:
- Additional cleaning algorithms
- UI/UX improvements
- Performance optimizations
- Testing and documentation

## License

MIT License - feel free to use this project for learning and development.

## Support

For issues or questions, check the code comments or extend with your own features!

---

**Version**: 0.1.0  
**Last Updated**: February 2026
