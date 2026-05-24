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
  updateMe: (data) => API.put('/auth/me', data),
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
  dataAnalyst: (data) => API.post('/ai/data-analyst', data),
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

// Sales
export const salesAPI = {
  orders: (params) => API.get('/sales/orders', { params }),
  create: (data) => API.post('/sales', data),
  update: (id, data) => API.put(`/sales/${id}`, data),
  delete: (id) => API.delete(`/sales/${id}`),
  previewMapping: (file) => {
    const form = new FormData();
    form.append('file', file);
    return API.post('/sales/preview-mapping', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
  },
  bulkImport: (file, mapping) => {
    const form = new FormData();
    form.append('file', file);
    if (mapping) form.append('mapping', JSON.stringify(mapping));
    return API.post('/sales/bulk-import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },
  downloadTemplate: () =>
    API.get('/sales/template', { responseType: 'blob' }),
};

export default API;
