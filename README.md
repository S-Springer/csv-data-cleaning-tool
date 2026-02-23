# CSV Data Cleaning & Analysis Tool

A full-stack application for Data Engineers and AI Engineers to clean, validate, and analyze CSV data. Simple to start with, scalable as your needs grow.

## Features

✨ **Data Upload**
- Drag-and-drop CSV file upload
- Automatic data parsing and basic statistics
- **Multi-encoding support** (UTF-8, Latin-1, ISO-8859-1, CP1252, UTF-16)

📊 **Data Analysis**
- Dataset overview (rows, columns, memory usage)
- Column-level statistics
- Data quality scoring (completeness & uniqueness)
- Missing values detection
- Duplicate row detection
- Interactive visualizations (column distributions, correlations)

🧹 **Data Cleaning**
- **Logical operation order**: Optimized workflow for efficient cleaning
  1. **Drop Columns** - Select which columns to keep
  2. **Fill Missing Values** - Handle NaN values (mean, median, forward fill, empty string, or drop)
  3. **Clean String Values** - Trim extra spaces and normalize whitespace in text columns
  4. **Data Standardization & Normalization** - Choose one numeric scaling method (z-score or min-max)
  5. **Remove Duplicates** - Remove duplicate rows
  6. **Remove Outliers** - Optional IQR-based outlier removal
- Multiple cleaning iterations supported
- Real-time preview updates after each operation
- Real-time quality score updates

🔐 **Authentication & File Management (MVP)**
- User registration and login with bearer token auth
- Optional authenticated workflow (existing anonymous workflow still supported)
- Persistent file metadata tracking (owner, lineage, creation time)
- File listing and deletion endpoints

🤖 **AI Assistant (MVP)**
- AI-powered dataset insights and cleaning recommendations
- Optional user question prompt for targeted guidance
- Endpoint supports OpenAI-compatible APIs via environment variables

⚡ **Large-File Batch Processing (MVP)**
- Chunk-based CSV upload endpoint for large files
- Batch metadata returned (chunk size, chunk count, detected encoding, total rows)

⬇️ **Export**
- Download cleaned datasets as CSV

🖥️ **Desktop Application**
- Standalone Windows executable (.exe)
- No installation required
- Built-in web UI with native window
- All features available offline

## Tech Stack

### Backend
- **Python 3.9+**
- **FastAPI** - Modern web framework
- **Pandas** - Data manipulation and analysis
- **NumPy** - Numerical computing

### Frontend
- **React 18** - UI framework
- **Recharts** - Data visualization library
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
├── main_win.py                       # Desktop app entry point
├── .gitignore
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

## Desktop Application (Windows)

### Option 1: Use Pre-built Executable

Simply download and run `csv-data-tool.exe` - no installation required!

### Option 2: Build from Source

1. Build the frontend:
```bash
cd frontend
npm install
npm run build
```

2. Activate the backend virtual environment:
```bash
cd ../backend
venv\Scripts\activate  # Windows
```

3. Build the executable:
```bash
cd ..
pyinstaller --noconfirm --onefile --add-data "frontend\build;frontend\build" --add-data "backend\app;app" --name csv-data-tool main_win.py
```

4. Run the executable:
```bash
.\dist\csv-data-tool.exe
```

The application will open in a native window with the full web interface embedded.

## API Endpoints

### Upload File
**POST** `/api/data/upload`
- Upload a CSV file for processing
- Returns: file_id, basic statistics

### Analyze Data
**GET** `/api/data/analyze/{file_id}`
- Get comprehensive analysis of uploaded data
- Returns: basic stats, column stats, quality score, missing values, duplicates
- Numeric column statistics include: q1, q3, iqr, skewness, kurtosis

### Batch Upload (Large Files)
**POST** `/api/data/upload/batch`
- Upload and process CSV in chunks for large-file workflows
- Query parameter: `chunk_size` (default `100000`)
- Returns: file_id, batch metadata, basic stats

### Clean Data
**POST** `/api/data/clean/{file_id}`
- Apply cleaning operations to data (executed in logical order)
- Request Body:
  - `columns_to_drop` (array): List of column names to remove
  - `fill_missing` (string): Strategy for missing values ('mean', 'median', 'forward_fill', 'empty_string', 'drop')
  - `clean_strings` (bool): Trim and normalize whitespace in string/text columns
  - `standardize_data` (string): Numeric scaling method ('zscore' or 'minmax')
  - `remove_duplicates` (bool): Remove duplicate rows
  - `remove_outliers` (bool): Remove statistical outliers
- Operations are applied in sequence: columns → missing → strings → scaling → duplicates → outliers
- Returns: Cleaned dataset info with new file_id (e.g., `{file_id}_cleaned_1`)

### AI Insights
**POST** `/api/data/ai/insights/{file_id}`
- Generate AI recommendations from dataset profile and quality stats
- Request Body:
  - `question` (string, optional): Ask a focused question about the dataset
- Returns: executive summary, cleaning steps, data quality risks, analysis ideas, next best action

## AI Configuration

Set these environment variables in your backend environment before running:

```bash
AI_API_KEY=your_api_key_here
AI_MODEL=gpt-4o-mini
```

Optional for OpenAI-compatible providers (Azure-compatible gateways, self-hosted endpoints, etc.):

```bash
AI_BASE_URL=https://your-provider-base-url/v1
```

### Download Data
**GET** `/api/data/download/{file_id}`
- Download processed data as CSV
- Returns: CSV content

### File Management
**GET** `/api/data/files`
- List tracked file metadata (all files for anonymous use, or current user's files when authenticated)

**DELETE** `/api/data/files/{file_id}`
- Delete tracked file metadata and in-memory dataset

### Authentication
**POST** `/api/auth/register`
- Create a user and return bearer token

**POST** `/api/auth/login`
- Authenticate user and return bearer token

**GET** `/api/auth/me`
- Get current authenticated user details

## Usage Example

1. **Launch the app**: Open `http://localhost:3000` in your browser
2. **Upload CSV**: Drag and drop or click to upload a CSV file
3. **Review Analysis**: Check data quality metrics, visualizations, and issues
4. **Clean Data**: Select cleaning options in logical order:
   - Step 1: Choose columns to keep (uncheck columns to drop)
   - Step 2: Select missing value strategy
  - Step 3: Optionally clean string values (trim/whitespace normalization)
  - Step 4: Optionally apply one scaling method (z-score or min-max)
  - Step 5: Check to remove duplicates
  - Step 6: Optionally remove outliers
5. **Apply Cleaning**: Click "Apply Cleaning" (can repeat multiple times)
6. **Review Results**: Check updated quality score and preview
7. **Download**: Export the cleaned dataset

### Why This Cleaning Order?

The operations are executed in a specific order for optimal results:

1. **Drop Columns First**: Reduces dataset size early, making subsequent operations faster
2. **Fill Missing Values**: Handles data completeness before deduplication
3. **Clean String Values**: Standardizes text formatting before record comparison and modeling
4. **Apply Numeric Scaling**: Makes numeric features comparable on a consistent scale
5. **Remove Duplicates**: Works on standardized values after text and numeric cleanup
6. **Remove Outliers Last**: Optional step that works best on cleaned, scaled data

This sequence minimizes computational overhead and produces the most reliable results.

## Scalability Features

This project is designed to scale:

### Short-term (v0.2-v0.3)
- ✅ Database integration foundation (SQLAlchemy + persistent metadata)
- ✅ User authentication and file management (MVP)
- ✅ Batch processing for large files (MVP chunked upload)
- ✅ More statistical analysis options (q1, q3, iqr, skewness, kurtosis)
- ✅ Data visualization with charts

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
- [x] Data visualization (charts, histograms) - ✅ Basic charts implemented
- [ ] More chart types (scatter plots, heatmaps)
- [ ] Workflow automation and scheduling
- [ ] Support for multiple file formats (Excel, JSON, Parquet)
- [ ] Real-time collaboration features
- [ ] API rate limiting and security
- [ ] Undo/redo functionality for cleaning operations

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

**Version**: 0.3.0  
**Last Updated**: February 19, 2026

**Recent Updates (v0.3.0)**:
- ✅ **String cleaning step** - Added text normalization (trim + whitespace cleanup)
- ✅ **Data standardization/normalization step** - Added z-score and min-max scaling options
- ✅ **Expanded ordered pipeline** - Cleaning flow now has 6 explicit ordered steps
- ✅ **UI wording improvements** - Combined scaling terminology in one user-facing step
- ✅ **Scalability foundations** - Added SQLAlchemy persistence and file metadata tracking
- ✅ **Authentication MVP** - Added register/login/me endpoints with bearer token auth
- ✅ **Batch upload MVP** - Added chunked CSV processing endpoint for large files
- ✅ **Richer statistics** - Added q1, q3, iqr, skewness, kurtosis to numeric analysis

**Recent Updates (v0.2.0)**:
- ✅ **Column dropping feature** - Select which columns to keep in your dataset
- ✅ **Logical operation ordering** - Cleaning operations now execute in optimal sequence
- ✅ **Multiple cleaning iterations** - Apply cleaning operations multiple times with unique file IDs
- ✅ **Data visualizations** - Interactive charts for column distributions and correlations
- ✅ **Large dataset handling** - Optimized JSON serialization for datasets with 1M+ rows
- ✅ **UI/UX improvements** - Step-by-step cleaning workflow with clear descriptions

**Previous Updates (v0.1.0)**:
- ✅ Windows desktop application with PyInstaller
- ✅ Multi-encoding CSV support (handles international characters)
- ✅ Fixed API routing for packaged application
- ✅ Dynamic API URL resolution for dev/production
