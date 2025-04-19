/**
 * Environment-specific configuration
 * 
 * This module provides configuration values based on the current environment (development, production, etc.)
 */

// Get environment from process.env or fallback to development
const ENV = process.env.REACT_APP_ENV || process.env.NODE_ENV || 'development';

// Base configurations for different environments
const configs = {
  development: {
    API_URL: 'http://localhost:5000/api',
    TOKEN_EXPIRY_BUFFER: 5 * 60, // 5 minutes in seconds
    ENABLE_LOGGING: true,
    TMDB_IMAGE_BASE_URL: 'https://image.tmdb.org/t/p',
    TMDB_DEFAULT_POSTER_SIZE: 'w300',
    TMDB_DEFAULT_BACKDROP_SIZE: 'w1280',
  },
  test: {
    API_URL: 'http://localhost:5000/api',
    TOKEN_EXPIRY_BUFFER: 5 * 60,
    ENABLE_LOGGING: false,
    TMDB_IMAGE_BASE_URL: 'https://image.tmdb.org/t/p',
    TMDB_DEFAULT_POSTER_SIZE: 'w300',
    TMDB_DEFAULT_BACKDROP_SIZE: 'w1280',
  },
  production: {
    API_URL: process.env.REACT_APP_API_URL || 'https://api.vortextv.com/api',
    TOKEN_EXPIRY_BUFFER: 10 * 60, // 10 minutes in seconds (more conservative for production)
    ENABLE_LOGGING: false,
    TMDB_IMAGE_BASE_URL: 'https://image.tmdb.org/t/p',
    TMDB_DEFAULT_POSTER_SIZE: 'w300',
    TMDB_DEFAULT_BACKDROP_SIZE: 'w1280',
  }
};

// Select the appropriate config based on current environment
const currentConfig = configs[ENV] || configs.development;

// Override with environment variables if provided
if (process.env.REACT_APP_API_URL) {
  currentConfig.API_URL = process.env.REACT_APP_API_URL;
}

// Log the environment and configuration in non-production environments
if (ENV !== 'production' && currentConfig.ENABLE_LOGGING) {
  console.log(`Environment: ${ENV}`);
  console.log('Configuration:', { 
    ...currentConfig,
    // Don't log sensitive data
    SENSITIVE_DATA: '[REDACTED]'
  });
}

// Export the configuration
export default {
  ...currentConfig,
  ENV,
  // Helper function to construct TMDB image URLs
  getTMDBImageUrl: (path, size) => {
    if (!path) return null;
    const imageSize = size || currentConfig.TMDB_DEFAULT_POSTER_SIZE;
    return `${currentConfig.TMDB_IMAGE_BASE_URL}/${imageSize}${path}`;
  }
}; 