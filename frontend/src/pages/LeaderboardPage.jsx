// src/pages/LeaderboardPage.jsx
import React, { useEffect, useState } from 'react';
import { getLeaderboard } from '../utils/api';

export default function LeaderboardPage({ onSelectExperiment }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getLeaderboard()
      .then(({ data }) => setEntries(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const MODEL_NAMES = {
    linear_regression: 'Linear Regression',
    logistic_regression: 'Logistic Regression',
    random_forest: 'Random Forest',
    gradient_boosting: 'Gradient Boosting',
  };

  return (
    <>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1>Leaderboard</h1>
            <p>Top 20 experiment runs ranked by primary metric (R² for regression, F1 for classification).</p>
          </div>
          <span className="badge badge-yellow">◈ Top Runs</span>
        </div>
      </div>

      <div className="page-body">
        {loading && (
          <div className="loading-overlay">
            <div className="spinner" />
            <p>Loading leaderboard…</p>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {!loading && entries.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">◈</span>
            <p>No experiments yet. Run your first experiment to see it ranked here.</p>
          </div>
        )}

        {!loading && entries.length > 0 && (
          <div className="card">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Dataset</th>
                    <th>Target</th>
                    <th>Task</th>
                    <th>Best Model</th>
                    <th>Score</th>
                    <th>Metric</th>
                    <th>Run #</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr
                      key={entry.experiment_id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onSelectExperiment(entry.experiment_id)}
                    >
                      <td>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: i === 0 ? 'var(--yellow)' : i === 1 ? 'var(--text-secondary)' : i === 2 ? '#cd7f32' : 'var(--text-muted)',
                          fontSize: '0.85rem',
                        }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </span>
                      </td>
                      <td className="mono-cell">{entry.dataset_name}</td>
                      <td className="mono-cell">{entry.target_column}</td>
                      <td>
                        <span className={`badge ${entry.task_type === 'regression' ? 'badge-purple' : 'badge-blue'}`}>
                          {entry.task_type}
                        </span>
                      </td>
                      <td>{MODEL_NAMES[entry.best_model] || entry.best_model || '—'}</td>
                      <td>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: scoreColor(entry.best_score),
                        }}>
                          {entry.best_score != null ? entry.best_score.toFixed(4) : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-blue">{entry.metric_label}</span>
                      </td>
                      <td className="number-cell">#{entry.run_number}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {formatDate(entry.created_at)}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onSelectExperiment(entry.experiment_id); }}>
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function scoreColor(score) {
  if (score == null) return 'var(--text-muted)';
  if (score > 0.9) return 'var(--green)';
  if (score > 0.7) return 'var(--accent)';
  if (score > 0.5) return 'var(--yellow)';
  return 'var(--red)';
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}
