import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Attach JWT to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartstore_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('smartstore_token');
      localStorage.removeItem('smartstore_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  me: () => API.get('/auth/me'),
};

// Products
export const productAPI = {
  getAll: (params) => API.get('/products', { params }),
  getOne: (id) => API.get(`/products/${id}`),
  create: (data) => API.post('/products', data),
  update: (id, data) => API.put(`/products/${id}`, data),
  delete: (id) => API.delete(`/products/${id}`),
  getCategories: () => API.get('/products/categories'),
};

// AI
export const aiAPI = {
  generateDescription: (data) => API.post('/ai/generate-description', data),
  generateTags: (data) => API.post('/ai/generate-tags', data),
  generateCaption: (data) => API.post('/ai/generate-caption', data),
  salesInsights: (data) => API.post('/ai/sales-insights', data),
  saveContent: (productId, data) => API.put(`/ai/save/${productId}`, data),
};

// Analytics
export const analyticsAPI = {
  summary: () => API.get('/analytics/summary'),
  revenue: (params) => API.get('/analytics/revenue', { params }),
  topProducts: (params) => API.get('/analytics/top-products', { params }),
  byCategory: () => API.get('/analytics/by-category'),
  byChannel: () => API.get('/analytics/by-channel'),
  lowStock: () => API.get('/analytics/low-stock'),
};

export default API;
