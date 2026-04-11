// src/components/StabilityChart.jsx
// Shows how model metrics change across multiple runs on the same dataset.
// This is the "drift / run stability" feature — lightweight but meaningful.

import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const MODEL_COLORS = {
  random_forest: '#4f8ef7',
  gradient_boosting: '#3ecf8e',
  linear_regression: '#f5c542',
  logistic_regression: '#b57af8',
};

const MODEL_NAMES = {
  linear_regression: 'Linear Reg.',
  logistic_regression: 'Logistic Reg.',
  random_forest: 'Random Forest',
  gradient_boosting: 'Grad. Boosting',
};

export default function StabilityChart({ stabilityHistory, taskType }) {
  const [metric, setMetric] = useState(taskType === 'regression' ? 'r2' : 'f1');

  if (!stabilityHistory || stabilityHistory.length < 2) {
    return (
      <div className="empty-state">
        <span className="empty-icon">📈</span>
        <p>Run this experiment at least twice on the same dataset to see stability trends.</p>
      </div>
    );
  }

  // Collect all model names across all runs
  const allModels = [...new Set(
    stabilityHistory.flatMap((run) => Object.keys(run.metrics || {}))
  )];

  // Build chart data: one point per run
  const chartData = stabilityHistory.map((run, i) => {
    const point = { run: `Run ${run.run_number ?? i + 1}` };
    allModels.forEach((model) => {
      const val = run.metrics?.[model]?.[metric];
      point[model] = val != null ? parseFloat(val.toFixed(4)) : null;
    });
    return point;
  });

  // Compute per-model std dev to flag instability
  const instabilityFlags = allModels.map((model) => {
    const vals = chartData.map((d) => d[model]).filter((v) => v != null);
    if (vals.length < 2) return { model, std: 0, stable: true };
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const std = Math.sqrt(vals.map((v) => (v - mean) ** 2).reduce((a, b) => a + b, 0) / vals.length);
    return { model, std, stable: std < 0.03 };
  });

  const METRIC_OPTIONS = taskType === 'regression'
    ? [{ key: 'r2', label: 'R²' }, { key: 'rmse', label: 'RMSE' }, { key: 'mae', label: 'MAE' }]
    : [{ key: 'accuracy', label: 'Accuracy' }, { key: 'f1', label: 'F1' }, { key: 'precision', label: 'Precision' }, { key: 'recall', label: 'Recall' }];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 4, padding: '8px 12px', fontSize: '0.78rem',
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
        {payload.map((p) => (
          <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.stroke }} />
            <span style={{ color: 'var(--text-secondary)' }}>{MODEL_NAMES[p.dataKey] || p.dataKey}:</span>
            <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {p.value?.toFixed(4) ?? '—'}
            </strong>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Metric selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span className="text-muted" style={{ fontSize: '0.78rem' }}>Metric:</span>
        {METRIC_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            className={`btn btn-sm ${metric === opt.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMetric(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Stability badges */}
      <div className="stability-legend" style={{ marginBottom: 12 }}>
        {instabilityFlags.map(({ model, std, stable }) => (
          <div key={model} className="legend-item">
            <div className="legend-dot" style={{ background: MODEL_COLORS[model] || '#888' }} />
            <span>{MODEL_NAMES[model] || model}</span>
            <span className={`badge ${stable ? 'badge-green' : 'badge-yellow'}`}>
              {stable ? 'Stable' : 'Unstable'} σ={std.toFixed(3)}
            </span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="run"
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          {allModels.map((model) => (
            <Line
              key={model}
              type="monotone"
              dataKey={model}
              stroke={MODEL_COLORS[model] || '#888'}
              strokeWidth={2}
              dot={{ fill: MODEL_COLORS[model], strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
        σ &lt; 0.03 is considered stable. High variance may indicate data randomness or model sensitivity.
      </p>
    </div>
  );
}
