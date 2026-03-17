import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';
import './DataVisualizations.css';

function DataVisualizations({ data, columns, correlationMatrix }) {
  if (!data || !columns || data.length === 0) {
    return <div className="visualizations-placeholder">No data to visualize</div>;
  }

  // Identify numeric and categorical columns
  const numericColumns = columns.filter(col => {
    const sample = data[0]?.[col];
    return typeof sample === 'number' && !isNaN(sample);
  });

  const categoricalColumns = columns.filter(col => {
    const sample = data[0]?.[col];
    return typeof sample === 'string' || sample === null || sample === undefined;
  }).slice(0, 3); // Limit to 3 categorical columns

  return (
    <div className="visualizations-container">
      <h3>Data Visualizations</h3>

      {/* Numeric Distributions */}
      {numericColumns.length > 0 && (
        <div className="visualization-section">
          <h4>Numeric Column Distributions</h4>
          <div className="charts-grid">
            {numericColumns.map((col) => (
              <NumericHistogram key={col} data={data} column={col} />
            ))}
          </div>
        </div>
      )}

      {/* Categorical Distributions */}
      {categoricalColumns.length > 0 && (
        <div className="visualization-section">
          <h4>Categorical Value Counts</h4>
          <div className="charts-grid">
            {categoricalColumns.map((col) => (
              <CategoricalBarChart key={col} data={data} column={col} />
            ))}
          </div>
        </div>
      )}

      {/* Numeric Correlation Scatter (if multiple numeric columns) */}
      {numericColumns.length >= 2 && (
        <div className="visualization-section">
          <h4>Numeric Relationships</h4>
          <div className="charts-grid">
            {numericColumns.slice(0, 2).length === 2 && (
              <NumericScatter
                data={data}
                col1={numericColumns[0]}
                col2={numericColumns[1]}
              />
            )}
          </div>
        </div>
      )}

      {correlationMatrix && !correlationMatrix.error && (
        <div className="visualization-section">
          <h4>Correlation Heatmap</h4>
          <CorrelationHeatmap matrix={correlationMatrix} />
        </div>
      )}
    </div>
  );
}

function CorrelationHeatmap({ matrix }) {
  const columns = matrix?.columns || [];
  const values = matrix?.correlation_matrix || {};

  if (columns.length < 2) {
    return <div className="visualizations-placeholder">Need at least 2 numeric columns to show a correlation heatmap.</div>;
  }

  const getHeatClass = (value) => {
    if (value == null) return 'corr-cell corr-none';
    if (value >= 0.75) return 'corr-cell corr-pos-strong';
    if (value >= 0.4) return 'corr-cell corr-pos-mid';
    if (value > 0) return 'corr-cell corr-pos-light';
    if (value <= -0.75) return 'corr-cell corr-neg-strong';
    if (value <= -0.4) return 'corr-cell corr-neg-mid';
    if (value < 0) return 'corr-cell corr-neg-light';
    return 'corr-cell corr-none';
  };

  return (
    <div className="corr-wrap">
      <div className="corr-legend">
        <span className="legend-chip neg">Negative</span>
        <span className="legend-chip neutral">Near 0</span>
        <span className="legend-chip pos">Positive</span>
      </div>
      <div className="corr-table-scroll">
        <table className="corr-table">
          <thead>
            <tr>
              <th className="sticky-head">Column</th>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {columns.map((rowCol) => (
              <tr key={rowCol}>
                <th className="sticky-col">{rowCol}</th>
                {columns.map((col) => {
                  const value = values?.[rowCol]?.[col];
                  return (
                    <td key={`${rowCol}-${col}`} className={getHeatClass(value)}>
                      {value == null ? '-' : Number(value).toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NumericHistogram({ data, column }) {
  // Create bins for histogram
  const values = data
    .map(d => d[column])
    .filter(v => typeof v === 'number' && !isNaN(v));

  if (values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const binCount = Math.min(10, Math.ceil(Math.sqrt(values.length)));
  const binSize = (max - min) / binCount || 1;

  const bins = Array(binCount).fill(0);
  values.forEach(v => {
    const binIndex = Math.min(Math.floor((v - min) / binSize), binCount - 1);
    bins[binIndex]++;
  });

  const chartData = bins.map((count, i) => ({
    name: `${(min + i * binSize).toFixed(1)}-${(min + (i + 1) * binSize).toFixed(1)}`,
    count,
  }));

  return (
    <div className="chart-wrapper">
      <h5>{column}</h5>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CategoricalBarChart({ data, column }) {
  // Count occurrences of each value
  const counts = {};
  data.forEach(row => {
    const value = row[column] ?? 'Missing';
    counts[value] = (counts[value] || 0) + 1;
  });

  const chartData = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15) // Show top 15 categories
    .map(([name, count]) => ({
      name: String(name).slice(0, 20), // Truncate long names
      count,
    }));

  if (chartData.length === 0) return null;

  return (
    <div className="chart-wrapper">
      <h5>{column}</h5>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={100} />
          <Tooltip />
          <Bar dataKey="count" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function NumericScatter({ data, col1, col2 }) {
  const chartData = data
    .filter(d => typeof d[col1] === 'number' && typeof d[col2] === 'number')
    .slice(0, 500) // Limit to 500 points for performance
    .map(d => ({
      [col1]: d[col1],
      [col2]: d[col2],
    }));

  if (chartData.length === 0) return null;

  return (
    <div className="chart-wrapper">
      <h5>{col1} vs {col2}</h5>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={col1} name={col1} />
          <YAxis dataKey={col2} name={col2} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name={`${col1} vs ${col2}`} data={chartData} fill="#ffc658" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DataVisualizations;
