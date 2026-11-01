import api from './api';
import axios from 'axios';

const swapnaDecoderService = {
  // Get all dream symbols
  getAll: async (filters = {}) => {
    const response = await api.get('/swapna-decoder', { params: filters });
    return response.data;
  },

  // Get single dream symbol by ID
  getById: async (id) => {
    const response = await api.get(`/swapna-decoder/${id}`);
    return response.data;
  },

  // Get analytics/stats
  getStats: async (params = {}) => {
    const response = await api.get('/swapna-decoder/analytics/stats', { params });
    return response.data;
  },

  // Get search suggestions
  getSuggestions: async (query, clientId) => {
    const params = { q: query };
    if (clientId) params.clientId = clientId;
    const response = await api.get('/swapna-decoder/search/suggestions', { params });
    return response.data;
  },

  // Get presigned URL for S3 upload
  getUploadUrl: async (fileName, fileType) => {
    const response = await api.post('/swapna-decoder/upload-url', { fileName, fileType });
    return response.data;
  },

  // Upload file to S3 (direct axios call, no auth needed)
  uploadToStorage: async (uploadUrl, file, onProgress) => {
    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          onProgress(progress);
        }
      }
    });
  },

  // AI interpretation of a typed dream; pass question + history for a follow-up
  interpret: async ({ dream, language, question, history }, token) => {
    const response = await api.post('/swapna-decoder/interpret', { dream, language, question, history }, { token });
    return response.data;
  },

  // Create new dream symbol
  create: async (data) => {
    const response = await api.post('/swapna-decoder', data);
    return response.data;
  },

  // Update dream symbol
  update: async (id, data) => {
    const response = await api.put(`/swapna-decoder/${id}`, data);
    return response.data;
  },

  // Toggle status
  toggleStatus: async (id) => {
    const response = await api.patch(`/swapna-decoder/${id}/toggle-status`);
    return response.data;
  },

  // Delete dream symbol
  delete: async (id) => {
    const response = await api.delete(`/swapna-decoder/${id}`);
    return response.data;
  }
};

export default swapnaDecoderService;
