import React, { useState } from 'react';
import { uploadFile } from '../services/api';
import './FileUpload.css';

function FileUpload({ onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleAreaKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      document.getElementById('file-input')?.click();
    }
  };

  const handleFile = async (file) => {
    const isSupportedFile = /\.(csv|xlsx|json)$/i.test(file.name || '');
    if (!isSupportedFile) {
      setError('Please upload a CSV, XLSX, or JSON file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await uploadFile(file);
      onUploadSuccess(result);
    } catch (err) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="file-upload">
      <div
        className={`upload-area ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="Upload CSV file"
        onKeyDown={handleAreaKeyDown}
      >
        <div className="upload-content">
          <h2>📁 Upload Data File</h2>
          <p>Drag and drop your dataset here, or click to browse and select a file.</p>
          <div className="upload-hints">
            <span className="hint-pill">Accepted: .csv, .xlsx, .json</span>
            <span className="hint-pill">Encoding auto-detect enabled</span>
          </div>
          <input
            type="file"
            accept=".csv,.xlsx,.json,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileInput}
            disabled={isLoading}
            id="file-input"
            style={{ display: 'none' }}
          />
          <label htmlFor="file-input" className="upload-button">
            {isLoading ? 'Uploading Dataset...' : 'Select File'}
          </label>
        </div>
      </div>
      {error && <div className="error-message" role="alert">{error}</div>}
    </div>
  );
}

export default FileUpload;
