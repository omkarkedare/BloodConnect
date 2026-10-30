import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 & expired authentication securely
// CRITICAL: Ordinary HTTP 403 permission errors (e.g. "The user doesn't have enough privileges")
// must NOT log the user out globally. Only unauthenticated (401) or corrupt/expired JWT tokens (403 with specific credential validation error) trigger session termination.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isUnauthorized = error.response?.status === 401;
    const isExpiredCredentials = 
      error.response?.status === 403 && 
      error.response?.data?.detail === 'Could not validate credentials';

    if (isUnauthorized || isExpiredCredentials) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
