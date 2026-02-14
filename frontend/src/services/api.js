import axios from 'axios';

// Use relative URL so it works both in development and packaged exe
const API_BASE_URL = window.location.origin === 'http://localhost:3000' || window.location.origin === 'http://localhost:3001'
  ? 'http://localhost:8000/api'
  : '/api';

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post(`${API_BASE_URL}/data/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const previewData = async (fileId, rows = 5) => {
  const response = await axios.get(`${API_BASE_URL}/data/preview/${fileId}`, {
    params: { rows },
  });
  return response.data;
};

export const analyzeData = async (fileId) => {
  const response = await axios.get(`${API_BASE_URL}/data/analyze/${fileId}`);
  return response.data;
};

export const cleanData = async (fileId, options) => {
  const response = await axios.post(`${API_BASE_URL}/data/clean/${fileId}`, options);
  return response.data;
};

export const downloadData = async (fileId) => {
  const response = await axios.get(`${API_BASE_URL}/data/download/${fileId}`);
  return response.data;
};

