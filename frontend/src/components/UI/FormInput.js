import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable form input component with validation and error display
 */
const FormInput = ({
  id,
  name,
  type = 'text',
  label,
  value,
  onChange,
  onBlur,
  error,
  touched,
  placeholder,
  disabled = false,
  required = false,
  className = '',
  containerClassName = '',
  labelClassName = '',
  helpText,
  ...rest
}) => {
  // Determine if we should show error
  const showError = error && touched;
  
  // Base classes for different states
  const baseInputClasses = "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition duration-200";
  const normalClasses = "border-gray-300 focus:border-blue-500 focus:ring-blue-500";
  const errorClasses = "border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50";
  const disabledClasses = "bg-gray-100 text-gray-500 cursor-not-allowed";
  
  // Combine classes based on state
  const inputClasses = `
    ${baseInputClasses}
    ${showError ? errorClasses : normalClasses}
    ${disabled ? disabledClasses : ''}
    ${className}
  `;

  // Handle input rendering based on type
  const renderInput = () => {
    // Common props for all input types
    const inputProps = {
      id,
      name,
      value: value || '',
      onChange,
      onBlur,
      disabled,
      placeholder,
      required,
      className: inputClasses,
      'aria-invalid': showError ? 'true' : 'false',
      'aria-describedby': showError ? `${id}-error` : undefined,
      ...rest
    };

    // Render different input types
    switch (type) {
      case 'textarea':
        return <textarea {...inputProps} rows={rest.rows || 3} />;
        
      case 'select':
        return (
          <select {...inputProps}>
            {rest.options?.map(option => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
        );
        
      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              {...inputProps}
              type="checkbox"
              checked={!!value}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            {label && (
              <label 
                htmlFor={id} 
                className={`ml-2 block text-sm text-gray-700 ${labelClassName}`}
              >
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
          </div>
        );
        
      case 'radio':
        return (
          <div className="flex items-center">
            <input
              {...inputProps}
              type="radio"
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            {label && (
              <label 
                htmlFor={id} 
                className={`ml-2 block text-sm text-gray-700 ${labelClassName}`}
              >
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
          </div>
        );
        
      default:
        return <input {...inputProps} type={type} />;
    }
  };

  // Don't include label twice for checkbox and radio
  const shouldRenderLabel = type !== 'checkbox' && type !== 'radio';

  return (
    <div className={`mb-4 ${containerClassName}`}>
      {/* Label (for non-checkbox/radio inputs) */}
      {shouldRenderLabel && label && (
        <label 
          htmlFor={id} 
          className={`block text-sm font-medium text-gray-700 mb-1 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* Input element */}
      {renderInput()}
      
      {/* Error message */}
      {showError && (
        <p 
          className="mt-1 text-sm text-red-600" 
          id={`${id}-error`}
        >
          {error}
        </p>
      )}
      
      {/* Help text */}
      {helpText && !showError && (
        <p className="mt-1 text-sm text-gray-500">
          {helpText}
        </p>
      )}
    </div>
  );
};

FormInput.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  type: PropTypes.oneOf([
    'text', 'email', 'password', 'number', 'tel', 'url', 
    'date', 'time', 'datetime-local', 'month', 'week',
    'checkbox', 'radio', 'textarea', 'select', 'color'
  ]),
  label: PropTypes.string,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.bool
  ]),
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  error: PropTypes.string,
  touched: PropTypes.bool,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  className: PropTypes.string,
  containerClassName: PropTypes.string,
  labelClassName: PropTypes.string,
  helpText: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      disabled: PropTypes.bool
    })
  )
};

export default FormInput; 