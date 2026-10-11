import axios from 'axios';

export const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
export const TOKEN_KEY = 'evms_token';

// Signature URLs from the API are relative (/uploads/...), so prefix the API origin.
export const assetUrl = (path) => (path ? `${API_ORIGIN}${path}` : null);

const api = axios.create({ baseURL: `${API_ORIGIN}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginCall = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginCall) {
      // Token missing, expired or invalid: drop the session.
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (error) => {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.request) return 'Cannot reach the server. Check that the backend is running.';
  return 'Something unexpected happened. Please try again.';
};

export const getFieldErrors = (error) => error.response?.data?.errors || {};

export default api;
