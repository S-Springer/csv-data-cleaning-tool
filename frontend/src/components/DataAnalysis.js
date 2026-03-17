import React, { useState, useEffect } from 'react';
import { analyzeData, getAdvancedStats, previewData } from '../services/api';
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
  const [advancedStats, setAdvancedStats] = useState(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);
        setChartData(null); // Clear cached chart data when switching files
        setAdvancedStats(null);
        
        // Check if this is a cleaned file (ends with _cleaned)
        const cleaned = fileId.includes('_cleaned');
        setIsDataCleaned(cleaned);
        
        const result = await analyzeData(fileId);
        setAnalysis(result);

        try {
          const statsResult = await getAdvancedStats(fileId);
          setAdvancedStats(statsResult?.advanced_stats || null);
        } catch (e) {
          console.warn('Could not fetch advanced stats:', e);
        }
        
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
        setAdvancedStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [fileId]);

  if (loading) return <div className="loading" role="status" aria-live="polite">Analyzing dataset...</div>;
  if (error) return <div className="error" role="alert">{error}</div>;
  if (!analysis) return null;

  const { basic_stats, quality_score, missing_values, duplicates } = analysis;
  const missingTotal = missing_values?.total_missing || 0;
  const duplicateTotal = duplicates?.total_duplicates || 0;

  return (
    <div className="data-analysis">
      <div className="analysis-header">
        <h2>📊 Data Analysis</h2>
        <div className={`file-status ${isDataCleaned ? 'cleaned' : 'original'}`}>
          {isDataCleaned ? '✓ Cleaned Data' : '📁 Original Data'}
        </div>
      </div>

      <div className="quick-insights">
        <div className="insight-card">
          <span className="insight-label">Quality Score</span>
          <span className="insight-value">{quality_score.overall_score}%</span>
        </div>
        <div className="insight-card">
          <span className="insight-label">Missing Cells</span>
          <span className="insight-value">{missingTotal}</span>
        </div>
        <div className="insight-card">
          <span className="insight-label">Duplicate Rows</span>
          <span className="insight-value">{duplicateTotal}</span>
        </div>
      </div>
      
      <DataPreview fileId={fileId} title="📋 Data Preview" />
      
      <div className="tabs" role="tablist" aria-label="Analysis Sections">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
          role="tab"
          id="analysis-tab-overview"
          aria-selected={activeTab === 'overview'}
          aria-controls="analysis-panel-overview"
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'visualizations' ? 'active' : ''}`}
          onClick={() => setActiveTab('visualizations')}
          role="tab"
          id="analysis-tab-visualizations"
          aria-selected={activeTab === 'visualizations'}
          aria-controls="analysis-panel-visualizations"
        >
          Visualizations
        </button>
        <button
          className={`tab ${activeTab === 'quality' ? 'active' : ''}`}
          onClick={() => setActiveTab('quality')}
          role="tab"
          id="analysis-tab-quality"
          aria-selected={activeTab === 'quality'}
          aria-controls="analysis-panel-quality"
        >
          Quality Score
        </button>
        <button
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
          role="tab"
          id="analysis-tab-stats"
          aria-selected={activeTab === 'stats'}
          aria-controls="analysis-panel-stats"
        >
          Stats
        </button>
        <button
          className={`tab ${activeTab === 'issues' ? 'active' : ''}`}
          onClick={() => setActiveTab('issues')}
          role="tab"
          id="analysis-tab-issues"
          aria-selected={activeTab === 'issues'}
          aria-controls="analysis-panel-issues"
        >
          Issues
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="tab-content" role="tabpanel" id="analysis-panel-overview" aria-labelledby="analysis-tab-overview">
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

      {activeTab === 'stats' && (
        <div className="tab-content" role="tabpanel" id="analysis-panel-stats" aria-labelledby="analysis-tab-stats">
          <h3>Advanced Numeric Statistics</h3>
          {advancedStats?.error ? (
            <div className="viz-empty-state">{advancedStats.error}</div>
          ) : (
            <>
              <div className="advanced-stats-summary">
                <div className="stat-chip">
                  <span>Numeric Columns</span>
                  <strong>{advancedStats?.summary?.numeric_columns ?? 0}</strong>
                </div>
                <div className="stat-chip">
                  <span>Rows</span>
                  <strong>{advancedStats?.summary?.row_count ?? 0}</strong>
                </div>
              </div>

              {advancedStats?.columns && Object.keys(advancedStats.columns).length > 0 ? (
                <div className="stats-table-wrap">
                  <table className="stats-table">
                    <thead>
                      <tr>
                        <th>Column</th>
                        <th>Mean</th>
                        <th>Std</th>
                        <th>Min</th>
                        <th>P25</th>
                        <th>Median</th>
                        <th>P75</th>
                        <th>P95</th>
                        <th>IQR</th>
                        <th>Skew</th>
                        <th>Kurtosis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(advancedStats.columns).map(([columnName, stats]) => (
                        <tr key={columnName}>
                          <td>{columnName}</td>
                          <td>{stats.mean == null ? '-' : Number(stats.mean).toFixed(2)}</td>
                          <td>{stats.std == null ? '-' : Number(stats.std).toFixed(2)}</td>
                          <td>{stats.min == null ? '-' : Number(stats.min).toFixed(2)}</td>
                          <td>{stats.percentiles?.p25 == null ? '-' : Number(stats.percentiles.p25).toFixed(2)}</td>
                          <td>{stats.percentiles?.p50 == null ? '-' : Number(stats.percentiles.p50).toFixed(2)}</td>
                          <td>{stats.percentiles?.p75 == null ? '-' : Number(stats.percentiles.p75).toFixed(2)}</td>
                          <td>{stats.percentiles?.p95 == null ? '-' : Number(stats.percentiles.p95).toFixed(2)}</td>
                          <td>{stats.iqr == null ? '-' : Number(stats.iqr).toFixed(2)}</td>
                          <td>{stats.skewness == null ? '-' : Number(stats.skewness).toFixed(2)}</td>
                          <td>{stats.kurtosis == null ? '-' : Number(stats.kurtosis).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="viz-empty-state">No numeric columns available for advanced stats.</div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'visualizations' && (
        <div className="tab-content" role="tabpanel" id="analysis-panel-visualizations" aria-labelledby="analysis-tab-visualizations">
          {(chartData?.data || []).length > 0 ? (
            <DataVisualizations
              data={chartData?.data || []}
              columns={chartData?.columns || []}
              correlationMatrix={analysis?.correlation_matrix}
            />
          ) : (
            <div className="viz-empty-state">Preview data is not available yet for charts.</div>
          )}
        </div>
      )}

      {activeTab === 'quality' && (
        <div className="tab-content" role="tabpanel" id="analysis-panel-quality" aria-labelledby="analysis-tab-quality">
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
        <div className="tab-content" role="tabpanel" id="analysis-panel-issues" aria-labelledby="analysis-tab-issues">
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
