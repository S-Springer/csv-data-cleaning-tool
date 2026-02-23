import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import DataAnalysis from './components/DataAnalysis';
import DataCleaner from './components/DataCleaner';
import AIAssistant from './components/AIAssistant';
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
          <div className="section-card">
            <div className="section-header">
              <h2>1) Upload Dataset</h2>
              <p>Start by uploading a CSV file to unlock analysis, cleaning, and AI insights.</p>
            </div>
            <FileUpload onUploadSuccess={handleUploadSuccess} />
          </div>
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
                <div className="section-card">
                  <div className="section-header">
                    <h2>2) Analyze</h2>
                    <p>Review dataset quality, column stats, and data profile.</p>
                  </div>
                  {currentFileId && <DataAnalysis key={currentFileId} fileId={currentFileId} />}
                </div>
              </div>

              <div className="right-panel">
                <div className="section-card">
                  <div className="section-header">
                    <h2>3) Clean & AI Assist</h2>
                    <p>Apply cleaning steps and generate AI recommendations for the active file.</p>
                  </div>
                  {uploadedFile && (
                    <>
                      <DataCleaner
                        fileId={uploadedFile.file_id}
                        onCleanSuccess={handleCleanSuccess}
                      />
                      <AIAssistant fileId={currentFileId || uploadedFile.file_id} />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>CSV Data Cleaning Tool v0.3.1 | Data Engineering Made Simple</p>
      </footer>
    </div>
  );
}

export default App;
