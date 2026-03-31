import React, { useState, useEffect, useRef } from 'react';
import { cleanData, downloadData, previewData } from '../services/api';
import useJobPolling from '../hooks/useJobPolling';
import DataPreview from './DataPreview';
import './DataCleaner.css';

const INITIAL_CLEAN_OPTIONS = {
  remove_duplicates: false,
  fill_missing: null,
  clean_strings: false,
  standardize_data: null,
  remove_outliers: false,
  columns_to_drop: [],
};

function DataCleaner({ fileId, onCleanSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(1);
  const [columns, setColumns] = useState([]);
  const [selectedColumnsToKeep, setSelectedColumnsToKeep] = useState(new Set());
  const [cleanOptions, setCleanOptions] = useState(INITIAL_CLEAN_OPTIONS);
  const [cleanResult, setCleanResult] = useState(null);
  const [downloadFormat, setDownloadFormat] = useState('csv');
  const [runInBackground, setRunInBackground] = useState(false);
  const [historyStack, setHistoryStack] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyIndexRef = useRef(-1);
  const { jobState, isPolling, resetJob, startPolling } = useJobPolling({
    onCompleted: (result) => {
      setError(null);
      setCleanResult(result);
      if (result?.cleaned_file_id) {
        onCleanSuccess(result.cleaned_file_id);
      }
    },
    onFailed: (message) => {
      setError(message || 'Cleaning job failed');
    },
  });

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  const applySnapshot = (snapshot) => {
    setCleanOptions(snapshot.cleanOptions);
    setSelectedColumnsToKeep(new Set(snapshot.selectedColumnsToKeep));
  };

  const pushHistoryState = (nextOptions, nextSelectedColumns) => {
    const snapshot = {
      cleanOptions: nextOptions,
      selectedColumnsToKeep: [...nextSelectedColumns],
    };

    setCleanOptions(nextOptions);
    setSelectedColumnsToKeep(new Set(nextSelectedColumns));

    setHistoryStack((prev) => {
      const currentIndex = historyIndexRef.current;
      const base = currentIndex >= 0 ? prev.slice(0, currentIndex + 1) : [];
      return [...base, snapshot];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  // Fetch column names on component mount
  useEffect(() => {
    const fetchColumns = async () => {
      try {
        const preview = await previewData(fileId, 1);
        if (preview.columns) {
          setColumns(preview.columns);
          const initialSnapshot = {
            cleanOptions: { ...INITIAL_CLEAN_OPTIONS },
            selectedColumnsToKeep: [...preview.columns],
          };
          applySnapshot(initialSnapshot);
          setHistoryStack([initialSnapshot]);
          setHistoryIndex(0);
        }
      } catch (err) {
        console.error('Failed to fetch columns:', err);
      }
    };
    fetchColumns();
  }, [fileId]);

  useEffect(() => {
    setActiveStep(1);
    setCleanResult(null);
    setError(null);
    resetJob();
  }, [fileId, resetJob]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex >= 0 && historyIndex < historyStack.length - 1;
  const isProcessing = isSubmitting || isPolling;

  const selectedOptionCount = [
    cleanOptions.columns_to_drop.length > 0,
    !!cleanOptions.fill_missing,
    cleanOptions.clean_strings,
    !!cleanOptions.standardize_data,
    cleanOptions.remove_duplicates,
    cleanOptions.remove_outliers,
  ].filter(Boolean).length;

  const stepConfig = {
    1: cleanOptions.columns_to_drop.length > 0,
    2: !!cleanOptions.fill_missing,
    3: cleanOptions.clean_strings,
    4: !!cleanOptions.standardize_data,
    5: cleanOptions.remove_duplicates,
    6: cleanOptions.remove_outliers,
  };

  const getStepPill = (step) => {
    if (stepConfig[step]) {
      return <span className="step-pill step-complete">Configured</span>;
    }
    return <span className="step-pill step-pending">Optional</span>;
  };

  const handleOptionChange = (option) => {
    const nextOptions = {
      ...cleanOptions,
      [option]: !cleanOptions[option],
    };
    pushHistoryState(nextOptions, selectedColumnsToKeep);
  };

  const handleFillMissingChange = (strategy) => {
    const nextOptions = {
      ...cleanOptions,
      fill_missing: cleanOptions.fill_missing === strategy ? null : strategy,
    };
    pushHistoryState(nextOptions, selectedColumnsToKeep);
  };

  const handleStandardizeChange = (method) => {
    const nextOptions = {
      ...cleanOptions,
      standardize_data: cleanOptions.standardize_data === method ? null : method,
    };
    pushHistoryState(nextOptions, selectedColumnsToKeep);
  };

  const handleColumnToggle = (column) => {
    const newSet = new Set(selectedColumnsToKeep);
    if (newSet.has(column)) {
      newSet.delete(column);
    } else {
      newSet.add(column);
    }

    const columnsToDropList = columns.filter(col => !newSet.has(col));
    const nextOptions = {
      ...cleanOptions,
      columns_to_drop: columnsToDropList,
    };

    pushHistoryState(nextOptions, newSet);
  };

  const handleSelectAllColumns = () => {
    const allSelected = new Set(columns);
    const nextOptions = {
      ...cleanOptions,
      columns_to_drop: [],
    };
    pushHistoryState(nextOptions, allSelected);
  };

  const handleDeselectAllColumns = () => {
    const noneSelected = new Set();
    const nextOptions = {
      ...cleanOptions,
      columns_to_drop: columns,
    };
    pushHistoryState(nextOptions, noneSelected);
  };

  const handleUndo = () => {
    if (!canUndo) {
      return;
    }
    const nextIndex = historyIndex - 1;
    const snapshot = historyStack[nextIndex];
    if (snapshot) {
      applySnapshot(snapshot);
      setHistoryIndex(nextIndex);
    }
  };

  const handleRedo = () => {
    if (!canRedo) {
      return;
    }
    const nextIndex = historyIndex + 1;
    const snapshot = historyStack[nextIndex];
    if (snapshot) {
      applySnapshot(snapshot);
      setHistoryIndex(nextIndex);
    }
  };

  const handleClean = async () => {
    setIsSubmitting(true);
    setError(null);
    setCleanResult(null);
    resetJob();

    try {
      const result = await cleanData(fileId, cleanOptions, { runAsync: runInBackground });

      if (runInBackground && result.job_id) {
        startPolling(result.job_id);
        return;
      }

      setCleanResult(result);
      onCleanSuccess(result.cleaned_file_id);
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Failed to clean data';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const jobStatusLabel = jobState.status === 'completed'
    ? 'Completed'
    : jobState.status === 'failed'
      ? 'Failed'
      : jobState.status === 'running'
        ? 'Running'
        : jobState.status === 'pending'
          ? 'Pending'
          : 'Idle';

  const handleDownload = async () => {
    try {
      const data = await downloadData(cleanResult.cleaned_file_id, downloadFormat);

      let blob;
      if (data.encoding === 'base64') {
        const binary = atob(data.content);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: data.mime_type });
      } else {
        blob = new Blob([data.content], { type: data.mime_type });
      }

      const element = document.createElement('a');
      element.href = URL.createObjectURL(blob);
      element.download = `${cleanResult.cleaned_file_id}.${downloadFormat}`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(element.href);
    } catch (err) {
      setError('Failed to download file');
    }
  };

  return (
    <div className="data-cleaner">
      <h3>🧹 Data Cleaning Options</h3>
      <p className="cleaning-order-note">Operations will be applied in the order shown below:</p>
      <p className="cleaning-tip">Tip: click each step title to expand and configure.</p>

      <div className="cleaner-summary-grid">
        <div className="cleaner-summary-card">
          <span className="summary-card-label">Configured Steps</span>
          <span className="summary-card-value">{selectedOptionCount}</span>
        </div>
        <div className="cleaner-summary-card">
          <span className="summary-card-label">Columns to Drop</span>
          <span className="summary-card-value">{cleanOptions.columns_to_drop.length}</span>
        </div>
        <div className="cleaner-summary-card">
          <span className="summary-card-label">Target File</span>
          <span className="summary-card-value summary-file" title={fileId}>{fileId}</span>
        </div>
      </div>

      <div className="async-mode-card">
        <label className="async-mode-toggle">
          <input
            type="checkbox"
            checked={runInBackground}
            onChange={(event) => setRunInBackground(event.target.checked)}
            disabled={isProcessing}
          />
          <span>Run cleaning in background</span>
        </label>
        <p className="async-mode-help">
          Submit long-running cleaning jobs and keep the result panel updated automatically while polling.
        </p>
        {jobState.jobId && (
          <div className={`job-status-panel status-${jobState.status}`} role="status" aria-live="polite">
            <span className={`job-status-pill status-${jobState.status}`}>{jobStatusLabel}</span>
            <span className="job-status-text">Job {jobState.jobId.slice(0, 8)} is {jobStatusLabel.toLowerCase()}.</span>
          </div>
        )}
      </div>

      <div className="cleaning-options">
        <div className={`option ${activeStep === 1 ? 'option-active' : ''}`}>
          <button className="step-header" onClick={() => setActiveStep(1)} aria-expanded={activeStep === 1} aria-controls="clean-step-1" id="clean-step-btn-1">
            <span className="step-number">Step 1:</span>
            <span>Drop Columns</span>
            {getStepPill(1)}
          </button>
          {activeStep === 1 && (
            <div id="clean-step-1" role="region" aria-labelledby="clean-step-btn-1">
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
          )}
        </div>

        <div className={`option ${activeStep === 2 ? 'option-active' : ''}`}>
          <button className="step-header" onClick={() => setActiveStep(2)} aria-expanded={activeStep === 2} aria-controls="clean-step-2" id="clean-step-btn-2">
            <span className="step-number">Step 2:</span>
            <span>Fill Missing Values</span>
            {getStepPill(2)}
          </button>
          {activeStep === 2 && (
            <div id="clean-step-2" role="region" aria-labelledby="clean-step-btn-2">
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
          )}
        </div>

        <div className={`option ${activeStep === 3 ? 'option-active' : ''}`}>
          <button className="step-header" onClick={() => setActiveStep(3)} aria-expanded={activeStep === 3} aria-controls="clean-step-3" id="clean-step-btn-3">
            <span className="step-number">Step 3:</span>
            <span>Clean String Values</span>
            {getStepPill(3)}
          </button>
          {activeStep === 3 && (
            <div id="clean-step-3" role="region" aria-labelledby="clean-step-btn-3">
              <label>
                <input
                  type="checkbox"
                  checked={cleanOptions.clean_strings}
                  onChange={() => handleOptionChange('clean_strings')}
                />
                <span>Enable string cleanup</span>
              </label>
              <p className="description">Trim leading/trailing spaces and normalize extra whitespace in text columns</p>
            </div>
          )}
        </div>

        <div className={`option ${activeStep === 4 ? 'option-active' : ''}`}>
          <button className="step-header" onClick={() => setActiveStep(4)} aria-expanded={activeStep === 4} aria-controls="clean-step-4" id="clean-step-btn-4">
            <span className="step-number">Step 4:</span>
            <span>Data Standardization & Normalization</span>
            {getStepPill(4)}
          </button>
          {activeStep === 4 && (
            <div id="clean-step-4" role="region" aria-labelledby="clean-step-btn-4">
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
          )}
        </div>

        <div className={`option ${activeStep === 5 ? 'option-active' : ''}`}>
          <button className="step-header" onClick={() => setActiveStep(5)} aria-expanded={activeStep === 5} aria-controls="clean-step-5" id="clean-step-btn-5">
            <span className="step-number">Step 5:</span>
            <span>Remove Duplicate Rows</span>
            {getStepPill(5)}
          </button>
          {activeStep === 5 && (
            <div id="clean-step-5" role="region" aria-labelledby="clean-step-btn-5">
              <label>
                <input
                  type="checkbox"
                  checked={cleanOptions.remove_duplicates}
                  onChange={() => handleOptionChange('remove_duplicates')}
                />
                <span>Enable duplicate removal</span>
              </label>
              <p className="description">Remove duplicate rows from the dataset</p>
            </div>
          )}
        </div>

        <div className={`option ${activeStep === 6 ? 'option-active' : ''}`}>
          <button className="step-header" onClick={() => setActiveStep(6)} aria-expanded={activeStep === 6} aria-controls="clean-step-6" id="clean-step-btn-6">
            <span className="step-number">Step 6 (Optional):</span>
            <span>Remove Outliers (IQR Method)</span>
            {getStepPill(6)}
          </button>
          {activeStep === 6 && (
            <div id="clean-step-6" role="region" aria-labelledby="clean-step-btn-6">
              <label>
                <input
                  type="checkbox"
                  checked={cleanOptions.remove_outliers}
                  onChange={() => handleOptionChange('remove_outliers')}
                />
                <span>Enable outlier removal</span>
              </label>
              <p className="description">Remove statistical outliers from numeric columns</p>
            </div>
          )}
        </div>
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}

      <div className="button-group sticky-action-bar">
        <div className="action-summary">
          <span>Selected options: <strong>{selectedOptionCount}</strong></span>
          <span className="active-file">Active file: <strong>{fileId}</strong></span>
          <span className="history-meta">History: <strong>{historyIndex + 1}</strong> / {historyStack.length}</span>
          {selectedOptionCount === 0 && (
            <span className="summary-hint">Select at least one step to apply cleaning changes.</span>
          )}
        </div>
        <div className="cleaner-actions">
          <button
            className="btn btn-neutral"
            onClick={handleUndo}
            disabled={!canUndo}
            type="button"
          >
            Undo
          </button>
          <button
            className="btn btn-neutral"
            onClick={handleRedo}
            disabled={!canRedo}
            type="button"
          >
            Redo
          </button>
        <button
          className="btn btn-primary"
          onClick={handleClean}
          disabled={isProcessing}
        >
          {isSubmitting ? 'Submitting...' : isPolling ? 'Background Job Running...' : 'Run Cleaning'}
        </button>
        </div>
      </div>

      {cleanResult && (
        <div className="cleaning-result" role="status" aria-live="polite">
          <h4>✓ Cleaning Complete</h4>
          <div className="status-chip success-chip">Last run succeeded</div>
          {jobState.jobId && <div className="job-meta">Background job: {jobState.jobId}</div>}
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
          <div className="download-actions">
            <label className="download-format-label" htmlFor="download-format">Format</label>
            <select
              id="download-format"
              className="download-format-select"
              value={downloadFormat}
              onChange={(e) => setDownloadFormat(e.target.value)}
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="xlsx">XLSX</option>
            </select>
            <button className="btn btn-secondary" onClick={handleDownload}>
              Download Cleaned Data
            </button>
          </div>

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
