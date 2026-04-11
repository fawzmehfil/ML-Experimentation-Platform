// src/pages/ExperimentHistoryPage.jsx
import React, { useEffect, useState } from 'react';
import { listExperiments } from '../utils/api';

const MODEL_LABELS = {
  linear_regression: 'Linear Reg.',
  logistic_regression: 'Logistic Reg.',
  random_forest: 'Random Forest',
  gradient_boosting: 'Grad. Boosting',
};

export default function ExperimentHistoryPage({ onSelectExperiment }) {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    listExperiments()
      .then(({ data }) => setExperiments(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = experiments.filter((e) =>
    !search ||
    e.dataset_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.target_column?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1>Experiment History</h1>
            <p>Browse and compare all saved experiment runs.</p>
          </div>
          <span className="badge badge-blue">{experiments.length} runs</span>
        </div>
      </div>

      <div className="page-body">
        <div style={{ marginBottom: 16, maxWidth: 340 }}>
          <input
            className="form-input"
            placeholder="Search by dataset or target…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading && (
          <div className="loading-overlay">
            <div className="spinner" />
            <p>Loading experiments…</p>
          </div>
        )}

        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">◫</span>
            <p>No experiments yet. Run your first experiment to see results here.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="card">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Dataset</th>
                    <th>Target</th>
                    <th>Task</th>
                    <th>Models</th>
                    <th>Best Score</th>
                    <th>Run #</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((exp) => {
                    const primary = exp.task_type === 'regression' ? 'r2' : 'f1';
                    const bestScore = getBestScore(exp.metrics, primary);

                    return (
                      <tr key={exp.id} style={{ cursor: 'pointer' }} onClick={() => onSelectExperiment(exp.id)}>
                        <td className="mono-cell">{exp.dataset_name}</td>
                        <td className="mono-cell">{exp.target_column}</td>
                        <td>
                          <span className={`badge ${exp.task_type === 'regression' ? 'badge-purple' : 'badge-blue'}`}>
                            {exp.task_type}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {(exp.models_trained || []).map((m) => (
                              <span key={m} className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                                {MODEL_LABELS[m] || m}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.82rem',
                            color: scoreColor(primary, bestScore),
                            fontWeight: 600,
                          }}>
                            {bestScore != null ? bestScore.toFixed(4) : '—'}
                          </span>
                          <span className="text-muted" style={{ fontSize: '0.7rem', marginLeft: 4 }}>
                            {primary.toUpperCase()}
                          </span>
                        </td>
                        <td className="number-cell">#{exp.run_number}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {formatDate(exp.created_at)}
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onSelectExperiment(exp.id); }}>
                            View →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function getBestScore(metrics, primaryKey) {
  if (!metrics) return null;
  const scores = Object.values(metrics).map((m) => m[primaryKey]).filter((v) => v != null);
  if (!scores.length) return null;
  return Math.max(...scores);
}

function scoreColor(metricKey, score) {
  if (score == null) return 'var(--text-muted)';
  if (metricKey === 'r2' || metricKey === 'f1' || metricKey === 'accuracy') {
    if (score > 0.9) return 'var(--green)';
    if (score > 0.6) return 'var(--accent)';
    return 'var(--yellow)';
  }
  return 'var(--text-primary)';
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
