import React, { useState } from 'react';
import { generateAIInsights } from '../services/api';
import './AIAssistant.css';

function AIAssistant({ fileId }) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await generateAIInsights(fileId, question);
      setResult(data);
      setGeneratedAt(new Date());
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Failed to generate AI insights';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const insights = result?.insights || {};

  return (
    <div className="ai-assistant">
      <h3>🤖 AI Assistant</h3>
      <p className="ai-description">Generate smart cleaning recommendations and next-step analysis ideas.</p>

      <textarea
        className="ai-question"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Optional: Ask a specific question about this dataset..."
        rows={3}
      />

      <div className="ai-action-row">
        <button className="btn btn-primary" onClick={handleGenerate} disabled={isLoading || !fileId}>
          {isLoading ? 'Generating Insights...' : 'Generate Insights'}
        </button>
        {!isLoading && result && <span className="ai-status-chip">Insights ready</span>}
      </div>

      {!result && !error && (
        <div className="ai-empty-state">
          Ask for guidance like “Which cleaning steps should I prioritize first?”
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

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
          {generatedAt && (
            <div className="ai-meta">Generated: {generatedAt.toLocaleTimeString()}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default AIAssistant;
