import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export const getHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const getDatasetSummary = async () => {
  const response = await api.get('/dataset/summary');
  return response.data;
};

export const getEDASummary = async () => {
  const response = await api.get('/eda/summary');
  return response.data;
};

export const getModelMetrics = async () => {
  const response = await api.get('/model/metrics');
  return response.data;
};

export const predictLoan = async (payload) => {
  const response = await api.post('/predict', payload);
  return response.data;
};

export const predictAndExplain = async (payload) => {
  const response = await api.post('/predict/explain', payload);
  return response.data;
};

export const getPredictions = async (limit = 50, skip = 0) => {
  const response = await api.get(`/predictions?limit=${limit}&skip=${skip}`);
  return response.data;
};

export const getPredictionById = async (id) => {
  const response = await api.get(`/predictions/${id}`);
  return response.data;
};

export const getMonitoringDrift = async () => {
  const response = await api.get('/monitoring/drift');
  return response.data;
};

export default api;
