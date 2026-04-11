// src/components/MetricCards.jsx
import React from 'react';

const REGRESSION_METRICS = [
  { key: 'r2', label: 'R²', desc: 'Variance explained', higher: true, format: (v) => v.toFixed(4) },
  { key: 'rmse', label: 'RMSE', desc: 'Root mean sq. error', higher: false, format: (v) => v.toFixed(4) },
  { key: 'mae', label: 'MAE', desc: 'Mean absolute error', higher: false, format: (v) => v.toFixed(4) },
];

const CLASSIFICATION_METRICS = [
  { key: 'accuracy', label: 'Accuracy', desc: 'Overall correctness', higher: true, format: (v) => `${(v * 100).toFixed(2)}%` },
  { key: 'f1', label: 'F1 Score', desc: 'Weighted harmonic mean', higher: true, format: (v) => v.toFixed(4) },
  { key: 'precision', label: 'Precision', desc: 'True pos / predicted pos', higher: true, format: (v) => v.toFixed(4) },
  { key: 'recall', label: 'Recall', desc: 'True pos / actual pos', higher: true, format: (v) => v.toFixed(4) },
];

function getQuality(key, value, higher) {
  if (key === 'r2') {
    if (value > 0.9) return 'good';
    if (value > 0.6) return '';
    return 'bad';
  }
  if (key === 'accuracy' || key === 'f1') {
    if (value > 0.9) return 'good';
    if (value > 0.7) return '';
    return 'bad';
  }
  return '';
}

export default function MetricCards({ metrics, taskType, bestModel }) {
  if (!metrics) return null;

  const metricDefs = taskType === 'regression' ? REGRESSION_METRICS : CLASSIFICATION_METRICS;
  const modelNames = Object.keys(metrics);

  return (
    <div>
      {modelNames.map((modelName) => {
        const m = metrics[modelName];
        const isBest = modelName === bestModel;

        return (
          <div key={modelName} style={{ marginBottom: 24 }}>
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                  {formatModelName(modelName)}
                </h3>
                {isBest && <span className="badge badge-green">Best</span>}
              </div>
              {m.cv_mean != null && (
                <span className="info-tag">
                  CV: {m.cv_mean.toFixed(4)} ± {m.cv_std?.toFixed(4)}
                </span>
              )}
            </div>

            <div className={`grid-${metricDefs.length > 3 ? '4' : '3'}`}>
              {metricDefs.map(({ key, label, desc, higher, format }) => {
                const value = m[key];
                if (value == null) return null;
                const quality = getQuality(key, value, higher);
                return (
                  <div className={`metric-card ${quality}`} key={key}>
                    <div className="metric-label">{label}</div>
                    <div className="metric-value">{format(value)}</div>
                    <div className="metric-sub">{desc}</div>
                  </div>
                );
              })}
            </div>

            {/* Confusion matrix for classification */}
            {taskType === 'classification' && m.confusion_matrix && m.confusion_matrix.length === 2 && (
              <div style={{ marginTop: 16 }}>
                <div className="section-title">Confusion Matrix</div>
                <ConfusionMatrix matrix={m.confusion_matrix} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ConfusionMatrix({ matrix }) {
  const [[tn, fp], [fn, tp]] = matrix;
  return (
    <div style={{ display: 'inline-block' }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
        Predicted →
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', gap: 3 }}>
        <div className="conf-cell header"></div>
        <div className="conf-cell header">Neg</div>
        <div className="conf-cell header">Pos</div>
        <div className="conf-cell header" style={{ fontSize: '0.65rem', writingMode: 'unset' }}>Act Neg</div>
        <div className="conf-cell tn">{tn}</div>
        <div className="conf-cell fp">{fp}</div>
        <div className="conf-cell header">Act Pos</div>
        <div className="conf-cell fn">{fn}</div>
        <div className="conf-cell tp">{tp}</div>
      </div>
    </div>
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
