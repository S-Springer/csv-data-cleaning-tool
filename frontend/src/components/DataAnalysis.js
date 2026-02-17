import React, { useState, useEffect } from 'react';
import { analyzeData, previewData } from '../services/api';
import DataPreview from './DataPreview';
import DataVisualizations from './DataVisualizations';
import './DataAnalysis.css';

function DataAnalysis({ fileId }) {
  const [analysis, setAnalysis] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isDataCleaned, setIsDataCleaned] = useState(false);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);
        setChartData(null); // Clear cached chart data when switching files
        
        // Check if this is a cleaned file (ends with _cleaned)
        const cleaned = fileId.includes('_cleaned');
        setIsDataCleaned(cleaned);
        
        const result = await analyzeData(fileId);
        setAnalysis(result);
        
        // Fetch preview data for visualizations (get more rows for better charts)
        try {
          const preview = await previewData(fileId, 1000);
          setChartData(preview);
        } catch (e) {
          console.warn('Could not fetch chart data:', e);
        }
      } catch (err) {
        setError(err.message || 'Failed to analyze data');
        setAnalysis(null);
        setChartData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [fileId]);

  if (loading) return <div className="loading">Loading analysis...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!analysis) return null;

  const { basic_stats, quality_score, missing_values, duplicates } = analysis;

  return (
    <div className="data-analysis">
      <div className="analysis-header">
        <h2>📊 Data Analysis</h2>
        <div className={`file-status ${isDataCleaned ? 'cleaned' : 'original'}`}>
          {isDataCleaned ? '✓ Cleaned Data' : '📁 Original Data'}
        </div>
      </div>
      
      <DataPreview fileId={fileId} title="📋 Data Preview" />
      
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'visualizations' ? 'active' : ''}`}
          onClick={() => setActiveTab('visualizations')}
        >
          📊 Visualizations
        </button>
        <button
          className={`tab ${activeTab === 'quality' ? 'active' : ''}`}
          onClick={() => setActiveTab('quality')}
        >
          Quality Score
        </button>
        <button
          className={`tab ${activeTab === 'issues' ? 'active' : ''}`}
          onClick={() => setActiveTab('issues')}
        >
          Data Issues
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="tab-content">
          <h3>Dataset Overview</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Rows</div>
              <div className="stat-value">{basic_stats.rows}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Columns</div>
              <div className="stat-value">{basic_stats.columns}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Memory Usage</div>
              <div className="stat-value">{basic_stats.memory_usage_mb} MB</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'visualizations' && (
        <div className="tab-content">
          <DataVisualizations
            data={chartData?.data || []}
            columns={chartData?.columns || []}
          />
        </div>
      )}

      {activeTab === 'quality' && (
        <div className="tab-content">
          <h3>Data Quality Score</h3>
          <div className="quality-container">
            <div className="quality-score">
              <div className="score-circle">
                <div className="score-value">{quality_score.overall_score}%</div>
              </div>
            </div>
            <div className="quality-details">
              <div className="quality-metric">
                <span>Completeness:</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${quality_score.completeness}%` }}
                  ></div>
                </div>
                <span>{quality_score.completeness}%</span>
              </div>
              <div className="quality-metric">
                <span>Uniqueness:</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${quality_score.uniqueness}%` }}
                  ></div>
                </div>
                <span>{quality_score.uniqueness}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'issues' && (
        <div className="tab-content">
          <h3>Data Issues</h3>
          <div className="issues-container">
            {Object.keys(missing_values.columns).length > 0 && (
              <div className="issue-section">
                <h4>Missing Values</h4>
                <ul>
                  {Object.entries(missing_values.columns).map(([col, count]) => (
                    <li key={col}>
                      <strong>{col}:</strong> {count} missing ({missing_values.percentages[col]}%)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {duplicates.total_duplicates > 0 && (
              <div className="issue-section">
                <h4>Duplicate Rows</h4>
                <p>
                  Found <strong>{duplicates.total_duplicates}</strong> duplicate rows ({duplicates.percentage}%)
                </p>
              </div>
            )}

            {Object.keys(missing_values.columns).length === 0 && duplicates.total_duplicates === 0 && (
              <p className="no-issues">✓ No data quality issues detected!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DataAnalysis;
