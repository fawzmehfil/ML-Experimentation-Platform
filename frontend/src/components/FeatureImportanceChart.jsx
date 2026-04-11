// src/components/FeatureImportanceChart.jsx
import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const MODEL_NAMES = {
  linear_regression: 'Linear Regression',
  logistic_regression: 'Logistic Regression',
  random_forest: 'Random Forest',
  gradient_boosting: 'Gradient Boosting',
};

export default function FeatureImportanceChart({ featureImportance }) {
  const models = Object.keys(featureImportance || {}).filter(
    (m) => featureImportance[m]?.length > 0
  );

  const [selectedModel, setSelectedModel] = useState(models[0] || null);

  if (!models.length) {
    return (
      <div className="empty-state">
        <span className="empty-icon">📊</span>
        <p>No feature importance data available for the selected models.</p>
      </div>
    );
  }

  const data = (featureImportance[selectedModel] || [])
    .slice(0, 15)
    .map((item) => ({
      feature: item.feature.length > 22 ? item.feature.slice(0, 22) + '…' : item.feature,
      value: Math.abs(item.importance),
      raw: item.importance,
      type: item.type,
    }))
    .reverse(); // show highest at top in horizontal bar chart

  const isCoefficient = data[0]?.type === 'coefficient';

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '8px 12px',
        fontSize: '0.78rem',
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', marginBottom: 4 }}>
          {d.feature}
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          {isCoefficient ? 'Coefficient' : 'Importance'}: <strong style={{ color: 'var(--text-primary)' }}>{d.raw.toFixed(6)}</strong>
        </div>
      </div>
    );
  };

  return (
    <div>
      {models.length > 1 && (
        <div className="tab-bar" style={{ marginBottom: 16 }}>
          {models.map((m) => (
            <button
              key={m}
              className={`tab-btn ${selectedModel === m ? 'active' : ''}`}
              onClick={() => setSelectedModel(m)}
            >
              {MODEL_NAMES[m] || m}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="badge badge-blue">
          {isCoefficient ? 'Coefficients' : 'Feature Importance'}
        </span>
        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
          Top {data.length} features · {MODEL_NAMES[selectedModel] || selectedModel}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ left: 120, right: 20, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="feature"
            width={115}
            tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
          <Bar dataKey="value" radius={[0, 3, 3, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={i === data.length - 1 ? 'var(--accent)' : `rgba(79,142,247,${0.3 + (i / data.length) * 0.7})`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
