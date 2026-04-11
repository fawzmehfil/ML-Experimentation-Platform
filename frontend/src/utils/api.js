// src/utils/api.js
// Centralized API client. Using axios with a base URL from .env.
// All API calls go through here — easy to swap backends or add auth later.

import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 2 min — ML training can be slow
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor: normalize error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// ── Dataset endpoints ──────────────────────────────────────────────
export const uploadDataset = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getDatasetSummary = (datasetId) =>
  api.get(`/dataset/${datasetId}/summary`);

export const listDatasets = () => api.get('/datasets');

// ── Experiment endpoints ───────────────────────────────────────────
export const runExperiment = (payload) =>
  api.post('/experiments/run', payload);

export const listExperiments = () => api.get('/experiments');

export const getExperiment = (experimentId) =>
  api.get(`/experiments/${experimentId}`);

export const exportExperiment = (experimentId) =>
  api.get(`/experiments/${experimentId}/export`);

export const getLeaderboard = () => api.get('/leaderboard');

export const checkHealth = () => api.get('/health');

export default api;
