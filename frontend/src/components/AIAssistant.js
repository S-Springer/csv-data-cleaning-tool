import React, { useState } from 'react';
import { generateAIInsights } from '../services/api';
import useJobPolling from '../hooks/useJobPolling';
import './AIAssistant.css';

function AIAssistant({ fileId }) {
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [runInBackground, setRunInBackground] = useState(false);
  const { jobState, isPolling, resetJob, startPolling } = useJobPolling({
    onCompleted: (nextResult) => {
      setError(null);
      setResult(nextResult);
      setGeneratedAt(new Date());
    },
    onFailed: (message) => {
      setError(message || 'AI insights job failed');
    },
  });

  const isLoading = isSubmitting || isPolling;

  const handleGenerate = async () => {
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    resetJob();

    try {
      const data = await generateAIInsights(fileId, question, { runAsync: runInBackground });

      if (runInBackground && data.job_id) {
        startPolling(data.job_id);
        return;
      }

      setResult(data);
      setGeneratedAt(new Date());
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Failed to generate AI insights';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const insights = result?.insights || {};
  const jobStatusLabel = jobState.status === 'completed'
    ? 'Completed'
    : jobState.status === 'failed'
      ? 'Failed'
      : jobState.status === 'running'
        ? 'Running'
        : jobState.status === 'pending'
          ? 'Pending'
          : 'Idle';

  return (
    <div className="ai-assistant">
      <h3>🤖 AI Assistant</h3>
      <p className="ai-description">Generate smart cleaning recommendations and next-step analysis ideas.</p>

      <textarea
        className="ai-question"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Optional: Ask a specific question about this dataset..."
        aria-label="Question for AI Assistant"
        rows={3}
      />

      <div className="ai-action-row">
        <button className="btn btn-primary" onClick={handleGenerate} disabled={isLoading || !fileId}>
          {isSubmitting ? 'Submitting...' : isPolling ? 'Background Job Running...' : 'Generate Insights'}
        </button>
        <label className="ai-background-toggle">
          <input
            type="checkbox"
            checked={runInBackground}
            onChange={(event) => setRunInBackground(event.target.checked)}
            disabled={isLoading}
          />
          <span>Run in background</span>
        </label>
        {!isLoading && result && <span className="ai-status-chip" role="status" aria-live="polite">Insights ready</span>}
      </div>

      {jobState.jobId && (
        <div className={`ai-job-status status-${jobState.status}`} role="status" aria-live="polite">
          <span className={`ai-job-pill status-${jobState.status}`}>{jobStatusLabel}</span>
          <span>Job {jobState.jobId.slice(0, 8)} is {jobStatusLabel.toLowerCase()}.</span>
        </div>
      )}

      {!result && !error && (
        <div className="ai-empty-state">
          Ask for guidance like “Which cleaning steps should I prioritize first?”
        </div>
      )}

      {error && <div className="error-message" role="alert">{error}</div>}

      {result && (
        <div className="ai-result">
          <div className="ai-summary">
            <strong>Summary:</strong> {insights.executive_summary || 'No summary provided'}
          </div>

          <div className="ai-section">
            <h4>Recommended Cleaning Steps</h4>
            <ul>
              {(insights.recommended_cleaning_steps || []).map((item, index) => (
                <li key={`clean-${index}`}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="ai-section">
            <h4>Data Quality Risks</h4>
            <ul>
              {(insights.data_quality_risks || []).map((item, index) => (
                <li key={`risk-${index}`}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="ai-section">
            <h4>Analysis Ideas</h4>
            <ul>
              {(insights.analysis_ideas || []).map((item, index) => (
                <li key={`idea-${index}`}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="ai-next-action">
            <strong>Next Best Action:</strong> {insights.next_best_action || 'No next action provided'}
          </div>

          <div className="ai-meta">Model: {result.model}</div>
          {jobState.jobId && <div className="ai-meta">Background job: {jobState.jobId}</div>}
          {generatedAt && (
            <div className="ai-meta">Generated: {generatedAt.toLocaleTimeString()}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default AIAssistant;
