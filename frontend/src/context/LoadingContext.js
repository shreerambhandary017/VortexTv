import React, { createContext, useContext, useState } from 'react';
import PropTypes from 'prop-types';
import LoadingSpinner from '../components/UI/LoadingSpinner';

// Create loading context
const LoadingContext = createContext({
  isLoading: false,
  loadingMessage: '',
  startLoading: () => {},
  stopLoading: () => {}
});

/**
 * Loading Provider component that manages global loading state
 */
export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Start loading with optional message
  const startLoading = (message = 'Loading...') => {
    setLoadingMessage(message);
    setIsLoading(true);
  };

  // Stop loading
  const stopLoading = () => {
    setIsLoading(false);
    setLoadingMessage('');
  };

  // Context value
  const value = {
    isLoading,
    loadingMessage,
    startLoading,
    stopLoading
  };

  return (
    <LoadingContext.Provider value={value}>
      {isLoading && <LoadingSpinner fullScreen message={loadingMessage} />}
      {children}
    </LoadingContext.Provider>
  );
};

LoadingProvider.propTypes = {
  children: PropTypes.node.isRequired
};

/**
 * Custom hook to access the loading context
 */
export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export default LoadingContext; 