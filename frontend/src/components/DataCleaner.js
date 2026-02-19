import React, { useState, useEffect } from 'react';
import { cleanData, downloadData, previewData } from '../services/api';
import DataPreview from './DataPreview';
import './DataCleaner.css';

function DataCleaner({ fileId, onCleanSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [columns, setColumns] = useState([]);
  const [selectedColumnsToKeep, setSelectedColumnsToKeep] = useState(new Set());
  const [cleanOptions, setCleanOptions] = useState({
    remove_duplicates: false,
    fill_missing: null,
    clean_strings: false,
    standardize_data: null,
    remove_outliers: false,
    columns_to_drop: [],
  });
  const [cleanResult, setCleanResult] = useState(null);

  // Fetch column names on component mount
  useEffect(() => {
    const fetchColumns = async () => {
      try {
        const preview = await previewData(fileId, 1);
        if (preview.columns) {
          setColumns(preview.columns);
          setSelectedColumnsToKeep(new Set(preview.columns)); // Initially select all
        }
      } catch (err) {
        console.error('Failed to fetch columns:', err);
      }
    };
    fetchColumns();
  }, [fileId]);

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

  const handleStandardizeChange = (method) => {
    setCleanOptions((prev) => ({
      ...prev,
      standardize_data: prev.standardize_data === method ? null : method,
    }));
  };

  const handleColumnToggle = (column) => {
    setSelectedColumnsToKeep((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(column)) {
        newSet.delete(column);
      } else {
        newSet.add(column);
      }
      
      // Update columns_to_drop based on selected columns
      const columnsToDropList = columns.filter(col => !newSet.has(col));
      setCleanOptions((opts) => ({
        ...opts,
        columns_to_drop: columnsToDropList,
      }));
      
      return newSet;
    });
  };

  const handleSelectAllColumns = () => {
    setSelectedColumnsToKeep(new Set(columns));
    setCleanOptions((prev) => ({
      ...prev,
      columns_to_drop: [],
    }));
  };

  const handleDeselectAllColumns = () => {
    setSelectedColumnsToKeep(new Set());
    setCleanOptions((prev) => ({
      ...prev,
      columns_to_drop: columns,
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
      <p className="cleaning-order-note">Operations will be applied in the order shown below:</p>

      <div className="cleaning-options">
        <div className="option">
          <span className="step-number">Step 1:</span>
          <span>Drop Columns</span>
          <p className="description">Select which columns to keep in your dataset</p>
          <div className="column-selection">
            <div className="column-buttons">
              <button className="btn btn-small" onClick={handleSelectAllColumns}>Select All</button>
              <button className="btn btn-small btn-secondary" onClick={handleDeselectAllColumns}>Deselect All</button>
            </div>
            <div className="columns-list">
              {columns.length > 0 ? (
                columns.map((col) => (
                  <label key={col} className="column-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedColumnsToKeep.has(col)}
                      onChange={() => handleColumnToggle(col)}
                    />
                    <span>{col}</span>
                  </label>
                ))
              ) : (
                <p className="no-columns">No columns available</p>
              )}
            </div>
            {cleanOptions.columns_to_drop.length > 0 && (
              <p className="columns-to-drop-info">
                {cleanOptions.columns_to_drop.length} column(s) will be dropped
              </p>
            )}
          </div>
        </div>

        <div className="option">
          <span className="step-number">Step 2:</span>
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
          <p className="description">Fill or remove missing values in remaining columns</p>
        </div>

        <div className="option">
          <span className="step-number">Step 3:</span>
          <label>
            <input
              type="checkbox"
              checked={cleanOptions.clean_strings}
              onChange={() => handleOptionChange('clean_strings')}
            />
            <span>Clean String Values</span>
          </label>
          <p className="description">Trim leading/trailing spaces and normalize extra whitespace in text columns</p>
        </div>

        <div className="option">
          <span className="step-number">Step 4:</span>
          <span>Data Standardization & Normalization</span>
          <div className="sub-options">
            <label>
              <input
                type="radio"
                name="standardize_data"
                checked={cleanOptions.standardize_data === 'zscore'}
                onChange={() => handleStandardizeChange('zscore')}
              />
              <span>Z-Score Standardization</span>
            </label>
            <label>
              <input
                type="radio"
                name="standardize_data"
                checked={cleanOptions.standardize_data === 'minmax'}
                onChange={() => handleStandardizeChange('minmax')}
              />
              <span>Min-Max Normalization (0 to 1)</span>
            </label>
          </div>
          <p className="description">Choose one numeric scaling method: z-score standardization or min-max normalization</p>
        </div>

        <div className="option">
          <span className="step-number">Step 5:</span>
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
          <span className="step-number">Step 6 (Optional):</span>
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
