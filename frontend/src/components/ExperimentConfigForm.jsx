// src/components/ExperimentConfigForm.jsx
import React from 'react';

const ALL_MODELS = [
  {
    key: 'linear_regression',
    label: 'Linear Regression',
    task: 'regression',
    desc: 'Fits a linear relationship. Fast and interpretable baseline.',
  },
  {
    key: 'logistic_regression',
    label: 'Logistic Regression',
    task: 'classification',
    desc: 'Linear decision boundary. Outputs class probabilities.',
  },
  {
    key: 'random_forest',
    label: 'Random Forest',
    task: 'both',
    desc: 'Ensemble of decision trees. Robust and feature-importance-aware.',
  },
  {
    key: 'gradient_boosting',
    label: 'Gradient Boosting',
    task: 'both',
    desc: 'Sequential boosting. High accuracy, slower to train.',
  },
];

export default function ExperimentConfigForm({
  columns = [],
  targetColumn,
  taskType,
  selectedModels,
  preprocessing,
  onTargetChange,
  onTaskTypeChange,
  onToggleModel,
  onPreprocessingChange,
  onRun,
  loading,
  error,
}) {
  const availableModels = ALL_MODELS.filter(
    (m) => m.task === taskType || m.task === 'both'
  );

  // Columns available for dropping (excludes target)
  const droppableColumns = columns.filter((c) => c !== targetColumn);

  const handleDropToggle = (col) => {
    const current = preprocessing.drop_columns || [];
    const next = current.includes(col)
      ? current.filter((c) => c !== col)
      : [...current, col];
    onPreprocessingChange({ ...preprocessing, drop_columns: next });
  };

  return (
    <div>
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          ⚠ {error}
        </div>
      )}

      <div className="grid-2" style={{ gap: 28 }}>
        {/* ── Left column: target + task + models ── */}
        <div>
          <div className="section-title">Target & Task</div>

          <div className="form-group">
            <label className="form-label">Target Column</label>
            <select
              className="form-select"
              value={targetColumn}
              onChange={(e) => onTargetChange(e.target.value)}
            >
              <option value="">— Select target —</option>
              {columns.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
            <span className="form-hint">The column your model will predict</span>
          </div>

          <div className="form-group">
            <label className="form-label">Task Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['regression', 'classification'].map((t) => (
                <button
                  key={t}
                  className={`btn ${taskType === t ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => onTaskTypeChange(t)}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="divider" />
          <div className="section-title">Models to Train</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {availableModels.map((model) => {
              const checked = selectedModels.includes(model.key);
              return (
                <div
                  key={model.key}
                  onClick={() => onToggleModel(model.key)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius)',
                    border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                    background: checked ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <div style={{
                      width: 14, height: 14, border: `2px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 3, background: checked ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', color: '#fff', flexShrink: 0,
                    }}>
                      {checked && '✓'}
                    </div>
                    <span style={{
                      fontWeight: 500,
                      color: checked ? 'var(--accent)' : 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}>
                      {model.label}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 22 }}>
                    {model.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right column: preprocessing ── */}
        <div>
          <div className="section-title">Preprocessing</div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Test Split</label>
              <select
                className="form-select"
                value={preprocessing.test_size}
                onChange={(e) => onPreprocessingChange({ ...preprocessing, test_size: parseFloat(e.target.value) })}
              >
                {[0.1, 0.15, 0.2, 0.25, 0.3].map((v) => (
                  <option key={v} value={v}>{(v * 100).toFixed(0)}%</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Val Split</label>
              <select
                className="form-select"
                value={preprocessing.val_size}
                onChange={(e) => onPreprocessingChange({ ...preprocessing, val_size: parseFloat(e.target.value) })}
              >
                {[0, 0.05, 0.1, 0.15, 0.2].map((v) => (
                  <option key={v} value={v}>{v === 0 ? 'None' : `${(v * 100).toFixed(0)}%`}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Missing Value Strategy</label>
            <select
              className="form-select"
              value={preprocessing.handle_missing}
              onChange={(e) => onPreprocessingChange({ ...preprocessing, handle_missing: e.target.value })}
            >
              <option value="mean">Mean imputation</option>
              <option value="median">Median imputation</option>
              <option value="mode">Mode (most frequent)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Feature Scaling</label>
            <select
              className="form-select"
              value={preprocessing.scaling}
              onChange={(e) => onPreprocessingChange({ ...preprocessing, scaling: e.target.value })}
            >
              <option value="standard">Standard Scaler (z-score)</option>
              <option value="minmax">Min-Max Scaler [0, 1]</option>
              <option value="none">None</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Options</label>
            <div className="checkbox-group">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={preprocessing.encode_categoricals}
                  onChange={(e) => onPreprocessingChange({ ...preprocessing, encode_categoricals: e.target.checked })}
                />
                One-hot encode categorical columns
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={preprocessing.use_cross_validation}
                  onChange={(e) => onPreprocessingChange({ ...preprocessing, use_cross_validation: e.target.checked })}
                />
                5-fold cross-validation
              </label>
            </div>
          </div>

          {droppableColumns.length > 0 && (
            <div className="form-group">
              <label className="form-label">Drop Columns</label>
              <div style={{
                maxHeight: 120,
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '8px 10px',
                background: 'var(--bg-input)',
              }}>
                {droppableColumns.map((col) => (
                  <label key={col} className="checkbox-item" style={{ marginBottom: 4 }}>
                    <input
                      type="checkbox"
                      checked={(preprocessing.drop_columns || []).includes(col)}
                      onChange={() => handleDropToggle(col)}
                    />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{col}</span>
                  </label>
                ))}
              </div>
              <span className="form-hint">Columns to exclude from training</span>
            </div>
          )}
        </div>
      </div>

      <div className="divider" />

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={onRun}
          disabled={loading || !targetColumn || selectedModels.length === 0}
        >
          {loading ? (
            <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Training...</>
          ) : (
            '▶ Run Experiment'
          )}
        </button>
      </div>
    </div>
  );
}
