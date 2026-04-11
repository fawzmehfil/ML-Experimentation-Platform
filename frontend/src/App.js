// src/App.js
import React, { useState } from 'react';
import './styles/global.css';
import NewExperimentPage from './pages/NewExperimentPage';
import ExperimentHistoryPage from './pages/ExperimentHistoryPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ExperimentDetailPage from './pages/ExperimentDetailPage';

// Simple client-side routing without react-router to keep deps minimal
const PAGES = {
  NEW: 'new',
  HISTORY: 'history',
  LEADERBOARD: 'leaderboard',
  DETAIL: 'detail',
};

export default function App() {
  const [page, setPage] = useState(PAGES.NEW);
  const [detailId, setDetailId] = useState(null);

  const navigate = (to, id = null) => {
    setPage(to);
    if (id) setDetailId(id);
  };

  return (
    <div className="layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-text">ML Platform</div>
          <div className="logo-sub">Experimentation Suite</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Workspace</div>

          <button
            className={`nav-item ${page === PAGES.NEW ? 'active' : ''}`}
            onClick={() => navigate(PAGES.NEW)}
          >
            <span className="nav-icon">⊕</span>
            New Experiment
          </button>

          <button
            className={`nav-item ${page === PAGES.HISTORY || page === PAGES.DETAIL ? 'active' : ''}`}
            onClick={() => navigate(PAGES.HISTORY)}
          >
            <span className="nav-icon">◫</span>
            Experiment History
          </button>

          <button
            className={`nav-item ${page === PAGES.LEADERBOARD ? 'active' : ''}`}
            onClick={() => navigate(PAGES.LEADERBOARD)}
          >
            <span className="nav-icon">◈</span>
            Leaderboard
          </button>

          <div className="nav-section-label" style={{ marginTop: 16 }}>Info</div>

          <div style={{ padding: '8px 10px' }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              lineHeight: 1.8,
            }}>
              <div>sklearn 1.3</div>
              <div>pandas 2.1</div>
              <div>Flask 3.0</div>
              <div>SQLite</div>
            </div>
          </div>
        </nav>

        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          Portfolio Project · 2024
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="main-content">
        {page === PAGES.NEW && <NewExperimentPage />}
        {page === PAGES.HISTORY && (
          <ExperimentHistoryPage
            onSelectExperiment={(id) => navigate(PAGES.DETAIL, id)}
          />
        )}
        {page === PAGES.LEADERBOARD && (
          <LeaderboardPage
            onSelectExperiment={(id) => navigate(PAGES.DETAIL, id)}
          />
        )}
        {page === PAGES.DETAIL && (
          <ExperimentDetailPage
            experimentId={detailId}
            onBack={() => navigate(PAGES.HISTORY)}
          />
        )}
      </main>
    </div>
  );
}
