import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL
});

// Debug function to help troubleshoot token issues
const debugToken = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('No token found in localStorage');
    return { hasToken: false };
  }

  try {
    // Try to extract data from the token (without verification)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('Token is not in valid JWT format (header.payload.signature)');
      return { hasToken: true, isValidFormat: false, token: token.substring(0, 15) + '...' };
    }

    // Decode the payload (middle part)
    const payload = JSON.parse(atob(tokenParts[1]));
    const expiry = new Date(payload.exp * 1000).toLocaleString();
    const nowSeconds = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp < nowSeconds;

    return {
      hasToken: true,
      isValidFormat: true,
      token: token.substring(0, 15) + '...',
      subject: payload.sub,
      role: payload.role,
      expiry,
      isExpired,
      expiresIn: isExpired ? 'Expired' : `${Math.floor((payload.exp - nowSeconds) / 60)} minutes`
    };
  } catch (error) {
    console.error('Error analyzing token:', error);
    return { hasToken: true, isValidFormat: false, error: error.message };
  }
};

// Ensure the token is correctly set up for all requests
const setupTokenRefresh = () => {
  const token = localStorage.getItem('token');
  if (token) {
    // Update both instances of axios
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    // Also set the global axios defaults to ensure any direct axios calls have the token
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Debug info
    console.log('API headers updated with token:', token.substring(0, 15) + '...');
    
    // Return token info for debugging
    const tokenInfo = debugToken();
    console.log('Token status:', tokenInfo);
    return tokenInfo;
  } else {
    delete api.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['Authorization'];
    console.log('API headers cleared - no token');
    return { hasToken: false };
  }
};

// Function to store token in a consistent way
const storeAuthToken = (token) => {
  if (!token) {
    console.warn('Attempted to store empty token');
    return false;
  }
  
  try {
    // Store in localStorage
    localStorage.setItem('token', token);
    
    // Update axios headers
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    console.log('Token stored and headers set');
    return true;
  } catch (error) {
    console.error('Error storing token:', error);
    return false;
  }
};

// Function to clear auth token completely
const clearAuthToken = () => {
  try {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['Authorization'];
    console.log('Auth token cleared completely');
    return true;
  } catch (error) {
    console.error('Error clearing token:', error);
    return false;
  }
};

// Call this once at import time
setupTokenRefresh();

// Add a request interceptor to include token with each request
api.interceptors.request.use(
  (config) => {
    // Always get fresh token for each request
    const token = localStorage.getItem('token');
    if (token) {
      // Make sure to use the correct format with a space after Bearer
      config.headers.Authorization = `Bearer ${token}`;
      
      // For debugging, log requests to certain critical endpoints
      const criticalEndpoints = ['/users/me', '/auth/login', '/admin/'];
      const isImportantRequest = criticalEndpoints.some(endpoint => config.url.includes(endpoint));
      
      if (isImportantRequest) {
        console.log(`Critical request to ${config.url} with token: ${token.substring(0, 15)}...`);
      }
    } else {
      // Only log missing tokens for endpoints that might need them
      if (!config.url.includes('/auth/login') && !config.url.includes('/auth/register')) {
        console.log(`Request to ${config.url} with no token`);
      }
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If we get a 401 error, clear the token and redirect to login
    if (error.response && error.response.status === 401) {
      console.log('Authentication error - clearing token');
      console.error('401 Error Details:', {
        url: error.config.url,
        method: error.config.method,
        headers: error.config.headers,
        data: error.config.data,
        responseData: error.response.data
      });
      
      // Don't clear token for login attempts that fail with 401
      if (!error.config.url.includes('/auth/login')) {
        clearAuthToken();
      }
    }
    return Promise.reject(error);
  }
);

// Authentication
const login = (credentials) => {
  // Clear any existing token before login attempt
  delete api.defaults.headers.common['Authorization'];
  return api.post('/auth/login', credentials);
};

const register = (userData) => {
  // Clear any existing token before register attempt
  delete api.defaults.headers.common['Authorization'];
  return api.post('/auth/register', userData);
};

const getCurrentUser = () => {
  setupTokenRefresh(); // Refresh token before making this critical request
  return api.get('/users/me');
};

// User management
const getAllUsers = () => {
  return api.get('/users');
};

const getUserById = (userId) => {
  return api.get(`/users/${userId}`);
};

const updateUser = (userId, userData) => {
  return api.put(`/users/${userId}`, userData);
};

const deleteUser = (userId) => {
  return api.delete(`/users/${userId}`);
};

const createUser = (userData) => {
  return api.post('/users', userData);
};

// Subscription management
const getAllSubscriptionPlans = () => {
  return api.get('/subscriptions/plans');
};

const getUserSubscription = () => {
  return api.get('/subscriptions/me');
};

const createSubscription = (planId) => {
  return api.post('/subscriptions', { plan_id: planId });
};

const cancelSubscription = () => {
  return api.delete('/subscriptions/me');
};

const checkSubscription = () => {
  return api.get('/subscriptions/check');
};

// Access code management
const generateAccessCode = async () => {
  console.log('API: generateAccessCode called');
  
  try {
    // Make sure token is refreshed before making the request
    setupTokenRefresh();
    
    // Log the authorization header to ensure it's set
    const authHeader = api.defaults.headers.common['Authorization'];
    console.log('API: Authorization header present:', !!authHeader);
    
    // Add timeout and retry logic
    const response = await api.post('/access/generate', {}, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log('API: Access code generation response:', response.data);
    return response;
  } catch (error) {
    console.error('API: Error generating access code:', error);
    console.error('API: Error response:', error.response?.data);
    
    // Throw the error with extra information
    throw error;
  }
};

const getAccessCodes = () => {
  return api.get('/access/me');
};

const redeemAccessCode = (accessCode) => {
  return api.post('/access/redeem', { code: accessCode });
};

const revokeAccessCode = (codeId) => {
  return api.post(`/access/revoke/${codeId}`);
};

// Admin functions
const getDashboardStats = () => {
  return api.get('/admin/stats');
};

const getAllSubscriptions = () => {
  return api.get('/admin/subscriptions');
};

const getUsersWithRoles = () => {
  return api.get('/admin/users');
};

const updateUserRole = (userId, role) => {
  return api.put(`/admin/users/${userId}/role`, { role });
};

// Update user information (for admin panel)
const adminUpdateUser = (userId, userData) => {
  console.log(`Updating user ${userId} with data:`, userData);
  return api.put(`/admin/users/${userId}`, userData);
};

// Watchlist/Favorites
const getFavorites = () => {
  return api.get('/favorites');
};

const addToFavorites = (contentId, contentType) => {
  return api.post('/favorites', { contentId, contentType });
};

const removeFromFavorites = (contentId) => {
  return api.delete(`/favorites/${contentId}`);
};

// Watch History
const getWatchHistory = () => {
  return api.get('/watch-history');
};

const addToWatchHistory = (contentId, watchDuration, watchPercentage) => {
  return api.post('/watch-history', { contentId, watchDuration, watchPercentage });
};

// User Profiles
const getUserProfiles = () => {
  return api.get('/profiles');
};

const createProfile = (profileData) => {
  return api.post('/profiles', profileData);
};

const updateProfile = (profileId, profileData) => {
  return api.put(`/profiles/${profileId}`, profileData);
};

const deleteProfile = (profileId) => {
  return api.delete(`/profiles/${profileId}`);
};

// Password management
const updatePassword = (currentPassword, newPassword) => {
  return api.post('/auth/update-password', { current_password: currentPassword, new_password: newPassword });
};

// Admin reset user password (superadmin only)
const adminResetUserPassword = (userId, newPassword) => {
  return api.put(`/admin/users/${userId}/password`, { new_password: newPassword });
};

// Password reset functions
const requestPasswordReset = async (email) => {
  try {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  } catch (error) {
    console.error('Error requesting password reset:', error);
    throw error;
  }
};

const resetPassword = async (token, newPassword) => {
  try {
    const response = await api.post('/auth/reset-password', { 
      token, 
      new_password: newPassword 
    });
    return response.data;
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
};

// Export API functions
export {
  api,
  login,
  register,
  getCurrentUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  createUser,
  getAllSubscriptionPlans,
  getUserSubscription,
  createSubscription,
  cancelSubscription,
  checkSubscription,
  generateAccessCode,
  getAccessCodes,
  redeemAccessCode,
  revokeAccessCode,
  getDashboardStats,
  getAllSubscriptions,
  getUsersWithRoles,
  updateUserRole,
  adminUpdateUser,
  getFavorites,
  addToFavorites,
  removeFromFavorites,
  getWatchHistory,
  addToWatchHistory,
  getUserProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  updatePassword,
  adminResetUserPassword,
  requestPasswordReset,
  resetPassword,
  storeAuthToken,
  clearAuthToken,
  setupTokenRefresh,
  debugToken
};

export default api; 