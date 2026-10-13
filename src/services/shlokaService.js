import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with auth token
const createAuthAxios = () => {
  const token = localStorage.getItem('token_user') || localStorage.getItem('token_client') || localStorage.getItem('token_admin');
  return axios.create({
    baseURL: `${API_BASE_URL}/shlokas`,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
    },
    timeout: 10000
  });
};

export const shlokaService = {
  // Get all shlokas with pagination and filters
  getShlokas: async (params = {}) => {
    try {
      const api = createAuthAxios();
      const response = await api.get('/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching shlokas:', error);
      throw error;
    }
  },

  // Get single shloka by ID
  getShloka: async (id) => {
    try {
      const api = createAuthAxios();
      const response = await api.get(`/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching shloka:', error);
      throw error;
    }
  },

  // Create new shloka
  createShloka: async (shlokaData) => {
    try {
      const api = createAuthAxios();
      const isFormData = shlokaData instanceof FormData;
      const response = await api.post('/', shlokaData, {
        headers: isFormData ? { 'Content-Type': undefined } : {}
      });
      return response.data;
    } catch (error) {
      console.error('Error creating shloka:', error);
      throw error;
    }
  },

  // Update shloka
  updateShloka: async (id, shlokaData) => {
    try {
      const api = createAuthAxios();
      const isFormData = shlokaData instanceof FormData;
      const response = await api.put(`/${id}`, shlokaData, {
        headers: isFormData ? { 'Content-Type': undefined } : {}
      });
      return response.data;
    } catch (error) {
      console.error('Error updating shloka:', error);
      throw error;
    }
  },

  // Delete shloka
  deleteShloka: async (id) => {
    try {
      const api = createAuthAxios();
      const response = await api.delete(`/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting shloka:', error);
      throw error;
    }
  },

  // Toggle shloka status (draft/published)
  toggleShlokaStatus: async (id) => {
    try {
      const api = createAuthAxios();
      const response = await api.patch(`/${id}/status`);
      return response.data;
    } catch (error) {
      console.error('Error toggling shloka status:', error);
      throw error;
    }
  },

  // Toggle shloka active status
  toggleShlokaActive: async (id) => {
    try {
      const api = createAuthAxios();
      const response = await api.patch(`/${id}/active`);
      return response.data;
    } catch (error) {
      console.error('Error toggling shloka active status:', error);
      throw error;
    }
  },

  // Get shlokas by chapter
  getShlokasByChapter: async (chapterNumber, params = {}) => {
    try {
      const api = createAuthAxios();
      const response = await api.get(`/chapter/${chapterNumber}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching chapter shlokas:', error);
      throw error;
    }
  },

  // Get shloka statistics
  getShlokaStats: async () => {
    try {
      const api = createAuthAxios();
      const response = await api.get('/stats/overview');
      return response.data;
    } catch (error) {
      console.error('Error fetching shloka stats:', error);
      throw error;
    }
  }
};