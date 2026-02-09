import React, { useState, useEffect } from 'react';
import { previewData } from '../services/api';
import './DataPreview.css';

function DataPreview({ fileId, title = '📋 Data Preview' }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState(5);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true);
        const result = await previewData(fileId, rows);
        setPreview(result);
      } catch (err) {
        setError(err.message || 'Failed to load preview');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [fileId, rows]);

  if (loading) return <div className="preview-loading">Loading preview...</div>;
  if (error) return <div className="preview-error">{error}</div>;
  if (!preview || preview.data.length === 0) return null;

  return (
    <div className="data-preview">
      <div className="preview-header">
        <h3>{title}</h3>
        <div className="preview-controls">
          <label>
            Show rows:
            <select value={rows} onChange={(e) => setRows(Number(e.target.value))}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </label>
          <span className="preview-info">
            {preview.rows_shown} of {preview.total_rows} rows
          </span>
        </div>
      </div>

      <div className="table-container">
        <table className="preview-table">
          <thead>
            <tr>
              {preview.columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.data.map((row, idx) => (
              <tr key={idx}>
                {preview.columns.map((col) => (
                  <td key={`${idx}-${col}`}>
                    {row[col] === null || row[col] === undefined || row[col] === '' ? (
                      <span className="null-value">—</span>
                    ) : (
                      String(row[col]).substring(0, 50)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataPreview;
