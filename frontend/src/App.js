import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import DataAnalysis from './components/DataAnalysis';
import DataCleaner from './components/DataCleaner';
import AIAssistant from './components/AIAssistant';
import './App.css';

function App() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [currentFileId, setCurrentFileId] = useState(null);
  const [activeView, setActiveView] = useState('analysis');

  const handleUploadSuccess = (result) => {
    setUploadedFile(result);
    setCurrentFileId(result.file_id);
    setActiveView('analysis');
  };

  const handleCleanSuccess = (cleanedFileId) => {
    setCurrentFileId(cleanedFileId);
    setActiveView('analysis');
  };

  const workflowSteps = [
    { key: 'upload', label: 'Upload', done: !!uploadedFile },
    { key: 'analysis', label: 'Analyze', done: !!currentFileId },
    {
      key: 'clean',
      label: 'Clean',
      done: !!currentFileId && currentFileId.includes('_cleaned'),
    },
    {
      key: 'ai',
      label: 'AI Assist',
      done: !!currentFileId,
    },
  ];

  const sectionConfig = {
    analysis: {
      title: 'Analyze Dataset',
      description: 'Review quality metrics, preview values, and explore visualizations.',
    },
    clean: {
      title: 'Clean Dataset',
      description: 'Configure data cleaning rules and create a cleaned output file.',
    },
    ai: {
      title: 'AI Assistant',
      description: 'Ask for cleaning suggestions and workflow guidance for the active dataset.',
    },
  };

  const sectionNavItems = [
    { key: 'analysis', label: 'Analyze', ready: !!currentFileId },
    { key: 'clean', label: 'Clean', ready: !!uploadedFile },
    { key: 'ai', label: 'AI Assistant', ready: !!currentFileId },
  ];

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>📊 TidyCSV</h1>
          <p>Guided CSV cleaning and analysis workflow</p>
        </div>
      </header>

      <main className="app-container">
        <section className="workflow-strip">
          {workflowSteps.map((step, index) => (
            <div key={step.key} className="workflow-item">
              <div className={`workflow-dot ${step.done ? 'done' : ''}`}>{index + 1}</div>
              <span className={`workflow-label ${step.done ? 'done' : ''}`}>{step.label}</span>
            </div>
          ))}
        </section>

        {!uploadedFile ? (
          <div className="section-card">
            <div className="section-header">
              <h2>Upload Dataset</h2>
              <p>Start by uploading a CSV file to unlock analysis, cleaning, and AI insights.</p>
            </div>
            <FileUpload onUploadSuccess={handleUploadSuccess} />
          </div>
        ) : (
          <div className="workspace">
            <div className="file-info">
              <div className="file-info-left">
                <div className="info-badge">
                  <span className="badge-label">Active File</span>
                  <span className="badge-value">{currentFileId || uploadedFile.file_id}</span>
                </div>
                <div className="info-stats">
                  <div className="info-stat">
                    <span className="stat-icon">📈</span>
                    <span>{uploadedFile.stats.rows} rows</span>
                  </div>
                  <div className="info-stat">
                    <span className="stat-icon">📋</span>
                    <span>{uploadedFile.stats.columns} columns</span>
                  </div>
                </div>
              </div>

              <button
                className="reset-button"
                onClick={() => {
                  setUploadedFile(null);
                  setCurrentFileId(null);
                  setActiveView('analysis');
                }}
              >
                Upload New File
              </button>
            </div>

            <div className="workspace-content">
              <aside className="workspace-sidebar" aria-label="Workspace Navigation" role="tablist">
                {sectionNavItems.map((item) => (
                  <button
                    key={item.key}
                    className={`sidebar-item ${activeView === item.key ? 'active' : ''}`}
                    onClick={() => setActiveView(item.key)}
                    role="tab"
                    aria-selected={activeView === item.key}
                    aria-controls={`panel-${item.key}`}
                    id={`tab-${item.key}`}
                  >
                    <span className="sidebar-label">{item.label}</span>
                    <span className={`sidebar-status ${item.ready ? 'ready' : ''}`}>
                      {item.ready ? 'Ready' : 'Pending'}
                    </span>
                  </button>
                ))}
              </aside>

              <div className="workspace-main">
                <div
                  className="section-card animated-panel"
                  key={activeView}
                  role="tabpanel"
                  id={`panel-${activeView}`}
                  aria-labelledby={`tab-${activeView}`}
                >
                  <div className="section-header">
                    <h2>{sectionConfig[activeView].title}</h2>
                    <p>{sectionConfig[activeView].description}</p>
                  </div>

                  {activeView === 'analysis' && currentFileId && (
                    <DataAnalysis key={currentFileId} fileId={currentFileId} />
                  )}

                  {activeView === 'clean' && uploadedFile && (
                    <DataCleaner
                      fileId={uploadedFile.file_id}
                      onCleanSuccess={handleCleanSuccess}
                    />
                  )}

                  {activeView === 'ai' && (
                    <AIAssistant fileId={currentFileId || uploadedFile.file_id} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>TidyCSV v0.3.1 | Data Engineering Made Simple</p>
      </footer>
    </div>
  );
}

export default App;
