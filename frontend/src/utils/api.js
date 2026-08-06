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
let isRefreshing = false;
let refreshPromise = null;

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
        // Multiple requests can 401 at the same moment (e.g. on page load). Since the
        // refresh token rotates on every use, firing a separate refresh call per request
        // would make all but the first one fail. Share a single in-flight refresh instead.
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = axios.post(`${API_URL}/api/v1/auth/refresh`, {}, { withCredentials: true })
            .finally(() => { isRefreshing = false; });
        }
        const res = await refreshPromise;
        if (res.data.success) {
          localStorage.setItem('dworkz_token', res.data.token);
          originalRequest.headers.Authorization = `Bearer ${res.data.token}`;
          return api(originalRequest);
        }
        return Promise.reject(error);
      } catch (err) {
        // Refresh failed, clear all session data
        console.error('[auth] Silent token refresh failed — forcing logout.', {
          reason: err.response?.data?.error || err.message,
          status: err.response?.status,
          path: window.location.pathname
        });
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
    // Surface a visible notification for failures that would otherwise be
    // silent — network errors (server unreachable, timeout, CORS) and 5xx
    // server errors. 4xx errors are left alone since calling code already
    // shows specific validation/auth messages for those.
    if (!originalRequest?.url?.includes('/api/v1/auth/refresh')) {
      if (!error.response) {
        window.dispatchEvent(new CustomEvent('api-error-toast', {
          detail: { isNetworkError: true, message: 'Unable to reach the server. Check your connection and try again.' }
        }));
      } else if (error.response.status >= 500) {
        window.dispatchEvent(new CustomEvent('api-error-toast', {
          detail: { isNetworkError: false, message: 'The server ran into a problem processing that request. Please try again shortly.' }
        }));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_URL };
