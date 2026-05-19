import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

// Request interceptor for adding the bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dworkz_token') || localStorage.getItem('dworkz_client_token');
    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling 401s and token refreshes
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Ignore refresh failures to prevent infinite loops
    if (originalRequest.url && originalRequest.url.includes('/api/v1/auth/refresh')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // If it's ONLY a client portal token, don't try to refresh admin auth
      if (localStorage.getItem('dworkz_client_token') && !localStorage.getItem('dworkz_token')) {
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_URL}/api/v1/auth/refresh`, {}, { withCredentials: true });
        if (res.data.success) {
          localStorage.setItem('dworkz_token', res.data.token);
          originalRequest.headers.Authorization = `Bearer ${res.data.token}`;
          return api(originalRequest);
        }
      } catch (err) {
        // Refresh failed, clear all session data
        const isClientPortal = window.location.pathname.startsWith('/client-portal');
        
        localStorage.removeItem('dworkz_token');
        localStorage.removeItem('dworkz_user');
        localStorage.removeItem('dworkz_client_token');
        localStorage.removeItem('dworkz_client');
        
        if (isClientPortal) {
          window.location.href = '/client-portal';
        } else {
          window.location.href = '/';
        }
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_URL };
