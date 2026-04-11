// src/components/ResultsDashboard.jsx
import React, { useState } from 'react';
import MetricCards from './MetricCards';
import FeatureImportanceChart from './FeatureImportanceChart';
import StabilityChart from './StabilityChart';
import { exportExperiment } from '../utils/api';

export default function ResultsDashboard({ results, taskType, onReset, experimentId }) {
  const [tab, setTab] = useState('metrics');
  const [exporting, setExporting] = useState(false);

  if (!results) return null;

  const { metrics, feature_importance, best_model, summary_text, stability_history } = results;

  const handleExport = async () => {
    if (!experimentId) return;
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
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      {/* Header row */}
      <div className="flex-between" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="badge badge-green">✓ Training Complete</span>
          <span className="badge badge-blue">{taskType}</span>
          {best_model && (
            <span className="info-tag">
              Best: {formatModelName(best_model)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm btn-secondary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : '↓ Export JSON'}
          </button>
          <button className="btn btn-sm btn-secondary" onClick={onReset}>
            + New Experiment
          </button>
        </div>
      </div>

      {/* AI Summary */}
      {summary_text && (
        <div className="summary-box" style={{ marginBottom: 24 }}>
          {summary_text}
        </div>
      )}

      {/* Tab navigation */}
      <div className="tab-bar">
        {[
          { key: 'metrics', label: 'Metrics' },
          { key: 'features', label: 'Feature Importance' },
          { key: 'stability', label: 'Run Stability' },
          { key: 'comparison', label: 'Model Comparison' },
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

      {/* Metrics tab */}
      {tab === 'metrics' && (
        <MetricCards metrics={metrics} taskType={taskType} bestModel={best_model} />
      )}

      {/* Feature importance tab */}
      {tab === 'features' && (
        <FeatureImportanceChart featureImportance={feature_importance} />
      )}

      {/* Stability tab */}
      {tab === 'stability' && (
        <StabilityChart stabilityHistory={stability_history} taskType={taskType} />
      )}

      {/* Comparison tab — side by side bar chart */}
      {tab === 'comparison' && (
        <ModelComparisonChart metrics={metrics} taskType={taskType} />
      )}
    </div>
  );
}

// ── Inline comparison chart ──────────────────────────────────────────────────
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';

function ModelComparisonChart({ metrics, taskType }) {
  const metricKeys = taskType === 'regression'
    ? ['r2', 'rmse', 'mae']
    : ['accuracy', 'f1', 'precision', 'recall'];

  const MODEL_COLORS = ['#4f8ef7', '#3ecf8e', '#f5c542', '#b57af8'];

  return (
    <div>
      {metricKeys.map((mKey) => {
        const data = Object.entries(metrics).map(([model, m]) => ({
          model: formatModelName(model),
          value: m[mKey] ?? 0,
        }));

        return (
          <div key={mKey} style={{ marginBottom: 28 }}>
            <div className="section-title">{mKey.toUpperCase()}</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={data} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="model"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    fontSize: '0.78rem',
                  }}
                  formatter={(v) => [v.toFixed(4), mKey.toUpperCase()]}
                />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={MODEL_COLORS[i % MODEL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}

function formatModelName(key) {
  const names = {
    linear_regression: 'Linear Reg.',
    logistic_regression: 'Logistic Reg.',
    random_forest: 'Random Forest',
    gradient_boosting: 'Grad. Boosting',
  };
  return names[key] || key;
}
