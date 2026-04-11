// src/hooks/useExperiment.js
// Custom hook that manages the full experiment workflow state.
// Keeps page components clean and logic reusable.

import { useState, useCallback } from 'react';
import { uploadDataset, getDatasetSummary, runExperiment } from '../utils/api';

export const STEPS = {
  UPLOAD: 'upload',
  SUMMARY: 'summary',
  CONFIG: 'config',
  RESULTS: 'results',
};

const DEFAULT_PREPROCESSING = {
  test_size: 0.2,
  val_size: 0.1,
  use_cross_validation: false,
  handle_missing: 'mean',
  scaling: 'standard',
  encode_categoricals: true,
  drop_columns: [],
};

export function useExperiment() {
  const [step, setStep] = useState(STEPS.UPLOAD);

  // Dataset state
  const [datasetId, setDatasetId] = useState(null);
  const [datasetMeta, setDatasetMeta] = useState(null);
  const [datasetSummary, setDatasetSummary] = useState(null);

  // Config state
  const [targetColumn, setTargetColumn] = useState('');
  const [taskType, setTaskType] = useState('regression');
  const [selectedModels, setSelectedModels] = useState(['random_forest']);
  const [preprocessing, setPreprocessing] = useState(DEFAULT_PREPROCESSING);

  // Results state
  const [results, setResults] = useState(null);
  const [experimentId, setExperimentId] = useState(null);

  // Async state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Step 1: Upload ──────────────────────────────────────────────
  const handleUpload = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await uploadDataset(file);
      setDatasetId(data.dataset_id);
      setDatasetMeta(data);
      setDatasetSummary(data.profile);
      setStep(STEPS.SUMMARY);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Step 2: Proceed from summary to config ──────────────────────
  const handleProceedToConfig = useCallback(() => {
    setStep(STEPS.CONFIG);
  }, []);

  // ── Step 3: Run experiment ──────────────────────────────────────
  const handleRunExperiment = useCallback(async () => {
    if (!targetColumn) {
      setError('Please select a target column');
      return;
    }
    if (selectedModels.length === 0) {
      setError('Please select at least one model');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      dataset_id: datasetId,
      target_column: targetColumn,
      task_type: taskType,
      models: selectedModels,
      preprocessing,
    };

    try {
      const { data } = await runExperiment(payload);
      setResults(data);
      setExperimentId(data.experiment_id);
      setStep(STEPS.RESULTS);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [datasetId, targetColumn, taskType, selectedModels, preprocessing]);

  // ── Reset to start ──────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setStep(STEPS.UPLOAD);
    setDatasetId(null);
    setDatasetMeta(null);
    setDatasetSummary(null);
    setTargetColumn('');
    setTaskType('regression');
    setSelectedModels(['random_forest']);
    setPreprocessing(DEFAULT_PREPROCESSING);
    setResults(null);
    setExperimentId(null);
    setError(null);
  }, []);

  const toggleModel = useCallback((modelKey) => {
    setSelectedModels((prev) =>
      prev.includes(modelKey)
        ? prev.filter((m) => m !== modelKey)
        : [...prev, modelKey]
    );
  }, []);

  return {
    // State
    step, datasetId, datasetMeta, datasetSummary,
    targetColumn, taskType, selectedModels, preprocessing,
    results, experimentId, loading, error,
    // Actions
    handleUpload, handleProceedToConfig, handleRunExperiment, handleReset,
    setTargetColumn, setTaskType, toggleModel,
    setPreprocessing, setError,
  };
}
