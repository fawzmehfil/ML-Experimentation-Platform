// src/pages/ExperimentDetailPage.jsx
import React, { useEffect, useState } from 'react';
import { getExperiment, exportExperiment } from '../utils/api';
import MetricCards from '../components/MetricCards';
import FeatureImportanceChart from '../components/FeatureImportanceChart';
import StabilityChart from '../components/StabilityChart';

export default function ExperimentDetailPage({ experimentId, onBack }) {
  const [exp, setExp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('metrics');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!experimentId) return;
    setLoading(true);
    getExperiment(experimentId)
      .then(({ data }) => setExp(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [experimentId]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data } = await exportExperiment(experimentId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `experiment-${experimentId.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return (
    <div className="loading-overlay" style={{ minHeight: '60vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <p>Loading experiment…</p>
    </div>
  );

  if (error) return (
    <div className="page-body">
      <div className="alert alert-error">{error}</div>
    </div>
  );

  if (!exp) return null;

  // Find best model
  const primary = exp.task_type === 'regression' ? 'r2' : 'f1';
  const bestModel = exp.metrics
    ? Object.entries(exp.metrics).sort((a, b) => (b[1][primary] ?? -999) - (a[1][primary] ?? -999))[0]?.[0]
    : null;

  return (
    <>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 6, paddingLeft: 0 }}>
              ← Back to History
            </button>
            <h1>{exp.dataset_name}</h1>
            <p>Target: <code className="mono">{exp.target_column}</code> · Run #{exp.run_number} · {formatDate(exp.created_at)}</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : '↓ Export JSON'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Experiment metadata */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">Experiment Info</span>
            <span className="badge badge-green">Saved</span>
          </div>
          <div className="card-body">
            <div className="grid-4">
              {[
                { label: 'Task', value: exp.task_type },
                { label: 'Models', value: (exp.models_trained || []).length },
                { label: 'Test Split', value: `${((exp.preprocessing_config?.test_size || 0.2) * 100).toFixed(0)}%` },
                { label: 'Scaling', value: exp.preprocessing_config?.scaling || 'standard' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="metric-label">{label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: 4 }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {exp.preprocessing_config?.drop_columns?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <span className="metric-label">Dropped Columns: </span>
                {exp.preprocessing_config.drop_columns.map((c) => (
                  <span key={c} className="badge badge-yellow" style={{ marginRight: 4 }}>{c}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Results tabs */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Results</span>
            {bestModel && <span className="badge badge-green">Best: {formatModelName(bestModel)}</span>}
          </div>
          <div className="card-body">
            <div className="tab-bar">
              {[
                { key: 'metrics', label: 'Metrics' },
                { key: 'features', label: 'Feature Importance' },
                { key: 'stability', label: 'Run Stability' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`tab-btn ${tab === key ? 'active' : ''}`}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'metrics' && (
              <MetricCards metrics={exp.metrics} taskType={exp.task_type} bestModel={bestModel} />
            )}
            {tab === 'features' && (
              <FeatureImportanceChart featureImportance={exp.feature_importance || {}} />
            )}
            {tab === 'stability' && (
              <StabilityChart stabilityHistory={exp.stability_history} taskType={exp.task_type} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function formatModelName(key) {
  const names = {
    linear_regression: 'Linear Regression',
    logistic_regression: 'Logistic Regression',
    random_forest: 'Random Forest',
    gradient_boosting: 'Gradient Boosting',
  };
  return names[key] || key;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
