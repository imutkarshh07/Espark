import axios from 'axios';
import { supabase } from './supabaseClient';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api',
  timeout: 60000, // 60s timeout to comfortably withstand Render free-tier cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach verified Supabase access token to outgoing requests
api.interceptors.request.use(
  async (config) => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('[API Interceptor] Could not fetch session token:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Format API error responses
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorData = error.response?.data?.error || {
      code: 'NETWORK_ERROR',
      message: error.message || 'Unable to communicate with the server.',
    };
    return Promise.reject(errorData);
  }
);

export default api;
