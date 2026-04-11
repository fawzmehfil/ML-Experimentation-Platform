// src/components/DatasetSummary.jsx
import React, { useState } from 'react';

export default function DatasetSummary({ meta, summary, onProceed }) {
  const [tab, setTab] = useState('schema');

  if (!summary) return null;

  const { columns = [], dtypes = {}, missing = {}, stats = {}, numeric_columns = [], categorical_columns = [], num_rows, num_cols } = summary;
  const preview = meta?.profile?.preview || [];

  const DTYPE_BADGE = {
    integer: 'badge-blue',
    float: 'badge-purple',
    string: 'badge-yellow',
    boolean: 'badge-green',
    datetime: 'badge-green',
  };

  return (
    <div>
      {/* Summary stats row */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Rows', value: num_rows?.toLocaleString() },
          { label: 'Columns', value: num_cols },
          { label: 'Numeric', value: numeric_columns.length },
          { label: 'Categorical', value: categorical_columns.length },
        ].map(({ label, value }) => (
          <div className="metric-card" key={label}>
            <div className="metric-label">{label}</div>
            <div className="metric-value">{value}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {['schema', 'statistics', 'preview'].map((t) => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Schema tab */}
      {tab === 'schema' && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Column</th>
                <th>Type</th>
                <th>Missing</th>
                <th>Missing %</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((col, i) => {
                const missingCount = missing[col] || 0;
                const missingPct = num_rows ? ((missingCount / num_rows) * 100).toFixed(1) : 0;
                const dtype = dtypes[col] || 'string';
                return (
                  <tr key={col}>
                    <td className="text-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{i + 1}</td>
                    <td className="mono-cell">{col}</td>
                    <td>
                      <span className={`badge ${DTYPE_BADGE[dtype] || 'badge-blue'}`}>{dtype}</span>
                    </td>
                    <td className="number-cell">{missingCount.toLocaleString()}</td>
                    <td>
                      <span style={{
                        color: missingPct > 20 ? 'var(--red)' : missingPct > 5 ? 'var(--yellow)' : 'var(--green)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.78rem',
                      }}>
                        {missingPct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Statistics tab */}
      {tab === 'statistics' && (
        <div className="table-scroll">
          {Object.keys(stats).length === 0 ? (
            <div className="empty-state">
              <p>No numeric columns found for statistics.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Mean</th>
                  <th>Std</th>
                  <th>Min</th>
                  <th>Median</th>
                  <th>Max</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats).map(([col, s]) => (
                  <tr key={col}>
                    <td className="mono-cell">{col}</td>
                    <td className="number-cell">{fmt(s.mean)}</td>
                    <td className="number-cell">{fmt(s.std)}</td>
                    <td className="number-cell">{fmt(s.min)}</td>
                    <td className="number-cell">{fmt(s.median)}</td>
                    <td className="number-cell">{fmt(s.max)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Preview tab */}
      {tab === 'preview' && (
        <div>
          <p className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 12 }}>
            Showing first {preview.length} rows
          </p>
          {preview.length > 0 ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    {Object.keys(preview[0]).map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((val, j) => (
                        <td key={j} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                          {val === '' || val === null || val === undefined
                            ? <span style={{ color: 'var(--red)', fontStyle: 'italic' }}>null</span>
                            : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state"><p>No preview available.</p></div>
          )}
        </div>
      )}

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary btn-lg" onClick={onProceed}>
          Configure Experiment →
        </button>
      </div>
    </div>
  );
}

function fmt(val) {
  if (val === null || val === undefined) return '—';
  if (Math.abs(val) >= 1000) return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return val.toFixed(4);
}
