import React, { useState } from 'react';
import { cleanData, downloadData } from '../services/api';
import DataPreview from './DataPreview';
import './DataCleaner.css';

function DataCleaner({ fileId, onCleanSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cleanOptions, setCleanOptions] = useState({
    remove_duplicates: false,
    fill_missing: null,
    remove_outliers: false,
  });
  const [cleanResult, setCleanResult] = useState(null);

  const handleOptionChange = (option) => {
    setCleanOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }));
  };

  const handleFillMissingChange = (strategy) => {
    setCleanOptions((prev) => ({
      ...prev,
      fill_missing: prev.fill_missing === strategy ? null : strategy,
    }));
  };

  const handleClean = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await cleanData(fileId, cleanOptions);
      setCleanResult(result);
      onCleanSuccess(result.cleaned_file_id);
    } catch (err) {
      setError(err.message || 'Failed to clean data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const data = await downloadData(cleanResult.cleaned_file_id);
      const element = document.createElement('a');
      const file = new Blob([data.csv], { type: 'text/csv' });
      element.href = URL.createObjectURL(file);
      element.download = `${cleanResult.cleaned_file_id}.csv`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (err) {
      setError('Failed to download file');
    }
  };

  return (
    <div className="data-cleaner">
      <h3>🧹 Data Cleaning Options</h3>

      <div className="cleaning-options">
        <div className="option">
          <label>
            <input
              type="checkbox"
              checked={cleanOptions.remove_duplicates}
              onChange={() => handleOptionChange('remove_duplicates')}
            />
            <span>Remove Duplicate Rows</span>
          </label>
          <p className="description">Remove duplicate rows from the dataset</p>
        </div>

        <div className="option">
          <span>Fill Missing Values</span>
          <div className="sub-options">
            <label>
              <input
                type="radio"
                name="fill_missing"
                checked={cleanOptions.fill_missing === 'mean'}
                onChange={() => handleFillMissingChange('mean')}
              />
              <span>Mean (numeric)</span>
            </label>
            <label>
              <input
                type="radio"
                name="fill_missing"
                checked={cleanOptions.fill_missing === 'median'}
                onChange={() => handleFillMissingChange('median')}
              />
              <span>Median (numeric)</span>
            </label>
            <label>
              <input
                type="radio"
                name="fill_missing"
                checked={cleanOptions.fill_missing === 'forward_fill'}
                onChange={() => handleFillMissingChange('forward_fill')}
              />
              <span>Forward Fill</span>
            </label>
            <label>
              <input
                type="radio"
                name="fill_missing"
                checked={cleanOptions.fill_missing === 'empty_string'}
                onChange={() => handleFillMissingChange('empty_string')}
              />
              <span>Empty String</span>
            </label>
            <label>
              <input
                type="radio"
                name="fill_missing"
                checked={cleanOptions.fill_missing === 'drop'}
                onChange={() => handleFillMissingChange('drop')}
              />
              <span>Drop Rows with Missing Values</span>
            </label>
          </div>
          <p className="description">Fill or remove missing values in your data</p>
        </div>

        <div className="option">
          <label>
            <input
              type="checkbox"
              checked={cleanOptions.remove_outliers}
              onChange={() => handleOptionChange('remove_outliers')}
            />
            <span>Remove Outliers (IQR Method)</span>
          </label>
          <p className="description">Remove statistical outliers from numeric columns</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="button-group">
        <button
          className="btn btn-primary"
          onClick={handleClean}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Apply Cleaning'}
        </button>
      </div>

      {cleanResult && (
        <div className="cleaning-result">
          <h4>✓ Cleaning Complete</h4>
          <div className="result-stats">
            <div className="result-item">
              <span>Operations Applied:</span>
              <ul>
                {cleanResult.operations.map((op, idx) => (
                  <li key={idx}>{op}</li>
                ))}
              </ul>
            </div>
            <div className="result-item">
              <span>New Quality Score:</span>
              <strong>{cleanResult.quality_score.overall_score}%</strong>
            </div>
            <div className="result-item">
              <span>Rows:</span>
              <strong>{cleanResult.stats.rows}</strong>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={handleDownload}>
            Download Cleaned Data
          </button>

          {cleanResult && (
            <DataPreview 
              fileId={cleanResult.cleaned_file_id} 
              title="📋 Cleaned Data Preview" 
            />
          )}
        </div>
      )}
    </div>
  );
}

export default DataCleaner;
