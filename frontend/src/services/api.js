import axios from 'axios';
import { useLoading } from '../context/LoadingContext';
import { useAuth } from '../context/AuthContext';
import config, { getApiUrl } from '../utils/config';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: config.authTimeout / 3 // Default timeout is 1/3 of auth timeout
});

/**
 * Custom hook that returns API methods with automatic loading state management
 * and error handling
 */
export const useApi = () => {
  const { startLoading, stopLoading } = useLoading();
  const { token, logout, refreshToken } = useAuth();

  // Configure request interceptor
  apiClient.interceptors.request.use(
    (config) => {
      // Add auth token if available
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Configure response interceptor
  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // Handle token expiration (401)
      if (error.response && error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          // Try to refresh the token
          const success = await refreshToken();
          if (success) {
            // Set new token in the request
            originalRequest.headers.Authorization = `Bearer ${token}`;
            // Retry the original request
            return apiClient(originalRequest);
          } else {
            // If refresh failed, logout
            logout();
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          logout();
        }
      }
      
      return Promise.reject(error);
    }
  );

  // Log requests in debug mode
  if (config.debug) {
    apiClient.interceptors.request.use(request => {
      console.log('🚀 API Request:', request.method?.toUpperCase(), request.url, request);
      return request;
    });
    
    apiClient.interceptors.response.use(response => {
      console.log('✅ API Response:', response.status, response.config.url, response);
      return response;
    }, error => {
      console.error('❌ API Error:', 
        error.response?.status || 'Network Error', 
        error.config?.url, 
        error.response || error
      );
      return Promise.reject(error);
    });
  }

  /**
   * Make an API request with automatic loading state
   * @param {Object} options - Request options
   * @param {string} options.url - The endpoint URL
   * @param {string} options.method - HTTP method (get, post, put, delete)
   * @param {Object} options.data - Request payload 
   * @param {string} options.loadingMessage - Custom loading message
   * @param {boolean} options.showLoading - Whether to show loading indicator
   * @returns {Promise} - Result of the API call
   */
  const request = async ({
    url,
    method = 'get',
    data = null,
    params = null,
    loadingMessage = 'Loading...',
    showLoading = true
  }) => {
    try {
      if (showLoading) {
        startLoading(loadingMessage);
      }

      // Convert relative URLs to full API URLs
      const apiUrl = url.startsWith('http') ? url : getApiUrl(url);

      const response = await apiClient({
        url: apiUrl,
        method,
        data,
        params
      });

      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      
      const errorMessage = 
        error.response?.data?.message || 
        error.message || 
        'An unexpected error occurred';
        
      throw new Error(errorMessage);
    } finally {
      if (showLoading) {
        stopLoading();
      }
    }
  };

  // Convenience methods
  return {
    get: (url, options = {}) => request({ url, method: 'get', ...options }),
    post: (url, data, options = {}) => request({ url, method: 'post', data, ...options }),
    put: (url, data, options = {}) => request({ url, method: 'put', data, ...options }),
    patch: (url, data, options = {}) => request({ url, method: 'patch', data, ...options }),
    delete: (url, options = {}) => request({ url, method: 'delete', ...options })
  };
};

export default apiClient; 