const environments = {
  development: {
    apiBaseUrl: 'http://localhost:5000/api',
    authTimeout: 30 * 60 * 1000, // 30 minutes
    tokenRefreshInterval: 5 * 60 * 1000, // 5 minutes
    debug: true
  },
  staging: {
    apiBaseUrl: 'https://staging-api.example.com/api',
    authTimeout: 30 * 60 * 1000,
    tokenRefreshInterval: 5 * 60 * 1000,
    debug: true
  },
  production: {
    apiBaseUrl: 'https://api.example.com/api',
    authTimeout: 60 * 60 * 1000, // 1 hour
    tokenRefreshInterval: 15 * 60 * 1000, // 15 minutes
    debug: false
  }
};

// Determine current environment
const getCurrentEnvironment = () => {
  // Read from environment variables if available
  if (process.env.REACT_APP_ENV) {
    return process.env.REACT_APP_ENV;
  }
  
  // Use hostname to detect environment
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'development';
  } else if (hostname.includes('staging') || hostname.includes('test')) {
    return 'staging';
  } else {
    return 'production';
  }
};

// Get current environment config
const env = getCurrentEnvironment();
const config = environments[env] || environments.development;

// Add environment name to config
config.environment = env;

// Export config object and helper function
export default config;

// Helper function to get API endpoint
export const getApiUrl = (endpoint) => {
  const baseUrl = config.apiBaseUrl;
  // Ensure endpoint starts with / and baseUrl doesn't end with /
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${formattedEndpoint}`;
}; 