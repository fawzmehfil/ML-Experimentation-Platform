// src/pages/NewExperimentPage.jsx
// The primary UX flow: Upload → Inspect → Configure → Results
// Uses the useExperiment hook to keep this component clean.

import React from 'react';
import { useExperiment, STEPS } from '../hooks/useExperiment';
import UploadZone from '../components/UploadZone';
import DatasetSummary from '../components/DatasetSummary';
import ExperimentConfigForm from '../components/ExperimentConfigForm';
import ResultsDashboard from '../components/ResultsDashboard';

const STEP_LIST = [
  { key: STEPS.UPLOAD,   label: 'Upload' },
  { key: STEPS.SUMMARY,  label: 'Inspect' },
  { key: STEPS.CONFIG,   label: 'Configure' },
  { key: STEPS.RESULTS,  label: 'Results' },
];

export default function NewExperimentPage() {
  const exp = useExperiment();
  const stepIndex = STEP_LIST.findIndex((s) => s.key === exp.step);

  return (
    <>
      <div className="page-header">
        <h1>New Experiment</h1>
        <p>Upload a dataset, configure preprocessing and models, then train and inspect results.</p>
      </div>

      <div className="page-body">
        {/* Step progress indicator */}
        <div className="steps" style={{ marginBottom: 28 }}>
          {STEP_LIST.map((s, i) => (
            <React.Fragment key={s.key}>
              <div className={`step ${i === stepIndex ? 'active' : i < stepIndex ? 'done' : ''}`}>
                <div className="step-num">
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                <span>{s.label}</span>
              </div>
              {i < STEP_LIST.length - 1 && <div className="step-connector" />}
            </React.Fragment>
          ))}
        </div>

        {/* ── Step 1: Upload ── */}
        {exp.step === STEPS.UPLOAD && (
          <div style={{ maxWidth: 580 }}>
            {exp.error && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                ⚠ {exp.error}
              </div>
            )}
            <UploadZone onFileSelect={exp.handleUpload} loading={exp.loading} />
            <SampleDataHint />
          </div>
        )}

        {/* ── Step 2: Dataset Summary ── */}
        {exp.step === STEPS.SUMMARY && (
          <div>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <span className="card-title">Dataset · {exp.datasetMeta?.filename}</span>
                <span className="info-tag">ID: {exp.datasetId?.slice(0, 8)}</span>
              </div>
              <div className="card-body">
                <DatasetSummary
                  meta={exp.datasetMeta}
                  summary={exp.datasetSummary}
                  onProceed={exp.handleProceedToConfig}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Config ── */}
        {exp.step === STEPS.CONFIG && (
          <div>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Experiment Configuration</span>
                <span className="info-tag">{exp.datasetMeta?.filename}</span>
              </div>
              <div className="card-body">
                <ExperimentConfigForm
                  columns={exp.datasetSummary?.columns || []}
                  targetColumn={exp.targetColumn}
                  taskType={exp.taskType}
                  selectedModels={exp.selectedModels}
                  preprocessing={exp.preprocessing}
                  onTargetChange={exp.setTargetColumn}
                  onTaskTypeChange={exp.setTaskType}
                  onToggleModel={exp.toggleModel}
                  onPreprocessingChange={exp.setPreprocessing}
                  onRun={exp.handleRunExperiment}
                  loading={exp.loading}
                  error={exp.error}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Results ── */}
        {exp.step === STEPS.RESULTS && (
          <div>
            {exp.loading ? (
              <div className="loading-overlay">
                <div className="spinner" style={{ width: 32, height: 32 }} />
                <p>Training models… this may take a moment</p>
              </div>
            ) : (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">
                    Results · {exp.datasetMeta?.filename} · target: {exp.targetColumn}
                  </span>
                  <span className="info-tag">Run #{exp.results?.run_number}</span>
                </div>
                <div className="card-body">
                  <ResultsDashboard
                    results={exp.results}
                    taskType={exp.taskType}
                    onReset={exp.handleReset}
                    experimentId={exp.experimentId}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function SampleDataHint() {
  return (
    <div style={{
      marginTop: 20,
      padding: '14px 16px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      fontSize: '0.8rem',
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', marginBottom: 6, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Expected CSV Format
      </div>
      <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        Tabular/structured data with a header row. Works best with financial, housing,
        healthcare, or classification datasets (e.g., Titanic, Iris, house prices, loan data).
      </div>
      <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '8px 10px', borderRadius: 'var(--radius)' }}>
        age,income,credit_score,loan_approved<br />
        32,58000,720,1<br />
        45,82000,680,1<br />
        28,41000,590,0
      </div>
    </div>
  );
}
