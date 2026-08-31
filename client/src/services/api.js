/**
 * Centralized Axios Instance
 * 
 * All API calls in the application should import this instance
 * instead of importing axios directly. This ensures:
 * 1. Consistent baseURL configuration
 * 2. Automatic cookie/credential handling
 * 3. Global token injection via request interceptor
 * 4. Centralized 401/503 error handling via response interceptor
 * 5. Network error detection for offline UI
 */
import axios from 'axios';
import { setupAxiosNetworkInterceptor } from '../utils/network';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Maintenance / overload mode
    if (error.response?.status === 503 && error.response?.data?.code === 'MAINTENANCE_OVERLOAD') {
      window.location.href = '/maintenance';
      return Promise.reject(error);
    }

    // Unauthorized — session expired
    if (error.response?.status === 401) {
      const path = window.location.pathname;

      // Don't redirect if already on auth pages
      if (path.includes('/login') || path.includes('/register') || path.includes('/admin-secret-login')) {
        return Promise.reject(error);
      }

      localStorage.removeItem('user');
      localStorage.removeItem('admin');
      localStorage.removeItem('role');
      localStorage.removeItem('token');
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

      if (path.includes('/admin')) {
        window.location.href = '/admin-secret-login';
        return Promise.reject(error);
      }

      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

setupAxiosNetworkInterceptor(api);

export default api;
