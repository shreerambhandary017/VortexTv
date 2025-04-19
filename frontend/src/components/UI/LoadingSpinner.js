import React from 'react';
import PropTypes from 'prop-types';

/**
 * Loading spinner component
 */
const LoadingSpinner = ({
  size = 'md',
  color = 'primary',
  fullScreen = false,
  message = '',
  className = '',
  overlay = false
}) => {
  // Size classes
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4'
  };
  
  // Color classes
  const colorClasses = {
    primary: 'border-blue-500',
    secondary: 'border-gray-500',
    success: 'border-green-500',
    danger: 'border-red-500',
    warning: 'border-yellow-500',
    info: 'border-cyan-500',
    light: 'border-gray-200',
    dark: 'border-gray-800',
    white: 'border-white'
  };
  
  // Base spinner classes
  const spinnerClasses = `
    inline-block rounded-full
    border-solid border-t-transparent animate-spin
    ${sizeClasses[size] || sizeClasses.md}
    ${colorClasses[color] || colorClasses.primary}
    ${className}
  `;
  
  // For fullscreen spinner with overlay
  if (fullScreen) {
    return (
      <div className={`
        fixed inset-0 z-50 flex flex-col items-center justify-center
        ${overlay ? 'bg-black bg-opacity-50' : ''}
      `}>
        <div className={spinnerClasses}></div>
        {message && (
          <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-200">
            {message}
          </p>
        )}
      </div>
    );
  }
  
  // For inline spinner
  return (
    <div className="flex items-center space-x-2">
      <div className={spinnerClasses}></div>
      {message && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {message}
        </span>
      )}
    </div>
  );
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  color: PropTypes.oneOf([
    'primary', 'secondary', 'success', 'danger',
    'warning', 'info', 'light', 'dark', 'white'
  ]),
  fullScreen: PropTypes.bool,
  message: PropTypes.string,
  className: PropTypes.string,
  overlay: PropTypes.bool
};

export default LoadingSpinner; 