import React, { useEffect, useState } from 'react';
import FileUpload from './components/FileUpload';
import DataAnalysis from './components/DataAnalysis';
import DataCleaner from './components/DataCleaner';
import AIAssistant from './components/AIAssistant';
import {
  clearAuthSession,
  extractApiErrorMessage,
  getAuthToken,
  getAuthUser,
  getCurrentUser,
  listFiles,
  loginUser,
  registerUser,
  setAuthSession,
} from './services/api';
import './App.css';

function App() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [currentFileId, setCurrentFileId] = useState(null);
  const [activeView, setActiveView] = useState('analysis');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authUser, setAuthUser] = useState(getAuthUser());
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [trackedFiles, setTrackedFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState('');

  const activeFileId = currentFileId || uploadedFile?.file_id || null;
  const activeRows = uploadedFile?.stats?.rows ?? uploadedFile?.rows ?? null;
  const activeColumns = uploadedFile?.stats?.columns ?? uploadedFile?.columns ?? null;

  const loadTrackedFiles = async () => {
    setFilesLoading(true);
    setFilesError('');
    try {
      const result = await listFiles();
      setTrackedFiles(result.files || []);
    } catch (error) {
      setFilesError(extractApiErrorMessage(error, 'Unable to load tracked files'));
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        return;
      }

      try {
        const me = await getCurrentUser();
        setAuthUser(me);
      } catch {
        clearAuthSession();
        setAuthUser(null);
      }
    };

    bootstrapAuth();
  }, []);

  useEffect(() => {
    loadTrackedFiles();
  }, [authUser]);

  const handleUploadSuccess = async (result) => {
    setUploadedFile(result);
    setCurrentFileId(result.file_id);
    setActiveView('analysis');
    await loadTrackedFiles();
  };

  const handleCleanSuccess = async (cleanedFileId) => {
    setCurrentFileId(cleanedFileId);
    setActiveView('analysis');
    await loadTrackedFiles();
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const authAction = authMode === 'login' ? loginUser : registerUser;
      const payload = {
        username: authForm.username.trim(),
        password: authForm.password,
      };
      const result = await authAction(payload);
      setAuthSession(result.access_token, result.user);
      setAuthUser(result.user);
      setAuthForm({ username: '', password: '' });
      await loadTrackedFiles();
    } catch (error) {
      setAuthError(extractApiErrorMessage(error, 'Authentication failed'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    clearAuthSession();
    setAuthUser(null);
    setUploadedFile(null);
    setCurrentFileId(null);
    setActiveView('analysis');
    await loadTrackedFiles();
  };

  const handleSelectTrackedFile = (file) => {
    setUploadedFile({
      file_id: file.file_id,
      rows: file.rows,
      columns: file.columns,
      stats: {
        rows: file.rows,
        columns: file.columns,
      },
    });
    setCurrentFileId(file.file_id);
    setActiveView('analysis');
  };

  const workflowSteps = [
    { key: 'upload', label: 'Upload', done: !!activeFileId },
    { key: 'analysis', label: 'Analyze', done: !!activeFileId },
    {
      key: 'clean',
      label: 'Clean',
      done: !!activeFileId && activeFileId.includes('_cleaned'),
    },
    {
      key: 'ai',
      label: 'AI Assist',
      done: !!activeFileId,
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
    { key: 'analysis', label: 'Analyze', ready: !!activeFileId },
    { key: 'clean', label: 'Clean', ready: !!activeFileId },
    { key: 'ai', label: 'AI Assistant', ready: !!activeFileId },
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
        <section className="auth-panel section-card">
          <div className="auth-panel-header">
            <div>
              <h2>Account</h2>
              <p>Sign in to keep a private list of your uploaded and cleaned files.</p>
            </div>

            {authUser && (
              <div className="auth-user-badge" aria-live="polite">
                Signed in as {authUser.username}
              </div>
            )}
          </div>

          {!authUser ? (
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <div className="auth-mode-toggle" role="tablist" aria-label="Auth mode">
                <button
                  type="button"
                  className={`auth-mode-btn ${authMode === 'login' ? 'active' : ''}`}
                  onClick={() => setAuthMode('login')}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={`auth-mode-btn ${authMode === 'register' ? 'active' : ''}`}
                  onClick={() => setAuthMode('register')}
                >
                  Register
                </button>
              </div>

              <div className="auth-fields">
                <input
                  type="text"
                  value={authForm.username}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, username: event.target.value }))}
                  placeholder="Username"
                  autoComplete="username"
                  required
                  minLength={3}
                  maxLength={100}
                />
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Password"
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  required
                  minLength={6}
                  maxLength={128}
                />
                <button type="submit" className="auth-submit" disabled={authLoading}>
                  {authLoading ? 'Working...' : authMode === 'login' ? 'Login' : 'Create Account'}
                </button>
              </div>
              {authError && <p className="auth-error">{authError}</p>}
            </form>
          ) : (
            <div className="auth-actions">
              <button type="button" className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </section>

        <section className="workflow-strip">
          {workflowSteps.map((step, index) => (
            <div key={step.key} className="workflow-item">
              <div className={`workflow-dot ${step.done ? 'done' : ''}`}>{index + 1}</div>
              <span className={`workflow-label ${step.done ? 'done' : ''}`}>{step.label}</span>
            </div>
          ))}
        </section>

        <section className="section-card tracked-files-card">
          <div className="tracked-files-header">
            <div>
              <h3>{authUser ? 'My Files' : 'Local Files'}</h3>
              <p>
                {authUser
                  ? 'These files are linked to your account.'
                  : 'Sign in to see only your own files.'}
              </p>
            </div>
            <button type="button" className="refresh-files-btn" onClick={loadTrackedFiles} disabled={filesLoading}>
              {filesLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {filesError && <p className="tracked-files-error">{filesError}</p>}

          {!filesError && trackedFiles.length === 0 && (
            <p className="tracked-files-empty">No tracked files yet. Upload a dataset to get started.</p>
          )}

          <div className="tracked-files-list">
            {trackedFiles.map((file) => (
              <div key={file.file_id} className="tracked-file-item">
                <div className="tracked-file-main">
                  <strong>{file.file_id}</strong>
                  <span>{file.original_filename}</span>
                  <small>{file.rows} rows • {file.columns} columns</small>
                </div>
                <button type="button" onClick={() => handleSelectTrackedFile(file)}>
                  Open
                </button>
              </div>
            ))}
          </div>
        </section>

        {!activeFileId ? (
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
                  <span className="badge-value">{activeFileId}</span>
                </div>
                <div className="info-stats">
                  <div className="info-stat">
                    <span className="stat-icon">📈</span>
                    <span>{activeRows ?? '-'} rows</span>
                  </div>
                  <div className="info-stat">
                    <span className="stat-icon">📋</span>
                    <span>{activeColumns ?? '-'} columns</span>
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
                Clear Active File
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

                  {activeView === 'analysis' && activeFileId && (
                    <DataAnalysis key={activeFileId} fileId={activeFileId} />
                  )}

                  {activeView === 'clean' && activeFileId && (
                    <DataCleaner
                      fileId={activeFileId}
                      onCleanSuccess={handleCleanSuccess}
                    />
                  )}

                  {activeView === 'ai' && (
                    <AIAssistant fileId={activeFileId} />
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
