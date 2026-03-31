import axios from 'axios';

// Use relative URL so it works both in development and packaged exe
const API_BASE_URL = window.location.origin === 'http://localhost:3000' || window.location.origin === 'http://localhost:3001'
  ? 'http://localhost:8000/api'
  : '/api';

const AUTH_TOKEN_KEY = 'tidycsv_auth_token';
const AUTH_USER_KEY = 'tidycsv_auth_user';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

export const getAuthUser = () => {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setAuthSession = (token, user) => {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
};

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAuthSession();
    }
    return Promise.reject(error);
  }
);

const extractApiErrorMessage = (error, fallback = 'Request failed') => {
  return error?.response?.data?.detail || error?.message || fallback;
};

export const registerUser = async ({ username, password }) => {
  const response = await apiClient.post('/auth/register', { username, password });
  return response.data;
};

export const loginUser = async ({ username, password }) => {
  const response = await apiClient.post('/auth/login', { username, password });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

export const listFiles = async () => {
  const response = await apiClient.get('/data/files');
  return response.data;
};

export { extractApiErrorMessage };

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await apiClient.post('/data/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const previewData = async (fileId, rows = 5) => {
  const response = await apiClient.get(`/data/preview/${fileId}`, {
    params: { rows },
  });
  return response.data;
};

export const analyzeData = async (fileId) => {
  const response = await apiClient.get(`/data/analyze/${fileId}`);
  return response.data;
};

export const getAdvancedStats = async (fileId) => {
  const response = await apiClient.get(`/data/stats/${fileId}`);
  return response.data;
};

export const cleanData = async (fileId, options, { runAsync = false } = {}) => {
  const response = await apiClient.post(`/data/clean/${fileId}`, options, {
    params: { run_async: runAsync },
  });
  return response.data;
};

export const downloadData = async (fileId, format = 'csv') => {
  const response = await apiClient.get(`/data/download/${fileId}`, {
    params: { format },
  });
  return response.data;
};

export const generateAIInsights = async (fileId, question = '', { runAsync = false } = {}) => {
  const response = await apiClient.post(
    `/data/ai/insights/${fileId}`,
    {
      question,
    },
    {
      params: { run_async: runAsync },
    }
  );
  return response.data;
};

export const getJobStatus = async (jobId) => {
  const response = await apiClient.get(`/jobs/${jobId}`);
  return response.data;
};

