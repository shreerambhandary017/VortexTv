import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import Toast from '../components/UI/Toast';

// Create context
const NotificationContext = createContext({
  showNotification: () => {},
  clearNotifications: () => {}
});

/**
 * Provider component for notifications
 */
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Add a new notification
  const showNotification = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now().toString();
    
    setNotifications(prevNotifications => [
      ...prevNotifications,
      { id, message, type, duration }
    ]);
    
    return id;
  }, []);

  // Show success notification
  const showSuccess = useCallback((message, duration) => {
    return showNotification(message, 'success', duration);
  }, [showNotification]);

  // Show error notification
  const showError = useCallback((message, duration) => {
    return showNotification(message, 'error', duration);
  }, [showNotification]);

  // Show warning notification
  const showWarning = useCallback((message, duration) => {
    return showNotification(message, 'warning', duration);
  }, [showNotification]);

  // Show info notification
  const showInfo = useCallback((message, duration) => {
    return showNotification(message, 'info', duration);
  }, [showNotification]);

  // Remove a notification by ID
  const removeNotification = useCallback((id) => {
    setNotifications(prevNotifications => 
      prevNotifications.filter(notification => notification.id !== id)
    );
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Context value
  const value = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Render toasts */}
      <div className="toast-container">
        {notifications.map((notification, index) => (
          <Toast
            key={notification.id}
            message={notification.message}
            type={notification.type}
            duration={notification.duration}
            position={`bottom-right`}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired
};

/**
 * Custom hook to use notifications
 */
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext; 