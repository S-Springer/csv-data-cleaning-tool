import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import DataAnalysis from './components/DataAnalysis';
import DataCleaner from './components/DataCleaner';
import './App.css';

function App() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [currentFileId, setCurrentFileId] = useState(null);

  const handleUploadSuccess = (result) => {
    setUploadedFile(result);
    setCurrentFileId(result.file_id);
  };

  const handleCleanSuccess = (cleanedFileId) => {
    setCurrentFileId(cleanedFileId);
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>📊 CSV Data Cleaning & Analysis Tool</h1>
          <p>Clean, analyze, and profile your CSV data with ease</p>
        </div>
      </header>

      <main className="app-container">
        {!uploadedFile ? (
          <FileUpload onUploadSuccess={handleUploadSuccess} />
        ) : (
          <div className="workspace">
            <div className="file-info">
              <div className="info-badge">
                <span className="badge-label">Loaded File:</span>
                <span className="badge-value">{uploadedFile.file_id}</span>
              </div>
              <div className="info-stats">
                <div className="info-stat">
                  <span className="stat-icon">📈</span>
                  <span>{uploadedFile.stats.rows} rows</span>
                </div>
                <div className="info-stat">
                  <span className="stat-icon">📋</span>
                  <span>{uploadedFile.stats.columns} columns</span>
                </div>
              </div>
              <button
                className="reset-button"
                onClick={() => {
                  setUploadedFile(null);
                  setCurrentFileId(null);
                }}
              >
                Upload New File
              </button>
            </div>

            <div className="main-content">
              <div className="left-panel">
                {currentFileId && <DataAnalysis key={currentFileId} fileId={currentFileId} />}
              </div>

              <div className="right-panel">
                {uploadedFile && (
                  <DataCleaner
                    fileId={uploadedFile.file_id}
                    onCleanSuccess={handleCleanSuccess}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>CSV Data Cleaning Tool v0.1.0 | Data Engineering Made Simple</p>
      </footer>
    </div>
  );
}

export default App;
