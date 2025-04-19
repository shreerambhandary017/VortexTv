/**
 * Common validation patterns and utility functions
 */

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

// Password validation - at least 8 chars, 1 uppercase, 1 lowercase, 1 number
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

// Username validation - 3-20 chars, letters, numbers, _ and -
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;

// URL validation
const URL_REGEX = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)$/;

// Phone number validation (basic)
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;

/**
 * Validation rules object - each rule is a function that takes a value and returns true if valid
 */
export const validators = {
  required: (value) => {
    return value !== undefined && value !== null && value !== '';
  },
  
  email: (value) => {
    if (!value) return true; // Skip if empty (use required for required fields)
    return EMAIL_REGEX.test(value);
  },
  
  minLength: (min) => (value) => {
    if (!value) return true;
    return value.length >= min;
  },
  
  maxLength: (max) => (value) => {
    if (!value) return true;
    return value.length <= max;
  },
  
  length: (min, max) => (value) => {
    if (!value) return true;
    return value.length >= min && value.length <= max;
  },
  
  password: (value) => {
    if (!value) return true;
    return PASSWORD_REGEX.test(value);
  },
  
  match: (matchField) => (value, formValues) => {
    if (!value) return true;
    return value === formValues[matchField];
  },
  
  username: (value) => {
    if (!value) return true;
    return USERNAME_REGEX.test(value);
  },
  
  url: (value) => {
    if (!value) return true;
    return URL_REGEX.test(value);
  },
  
  number: (value) => {
    if (!value) return true;
    return !isNaN(Number(value));
  },
  
  min: (min) => (value) => {
    if (!value) return true;
    return Number(value) >= min;
  },
  
  max: (max) => (value) => {
    if (!value) return true;
    return Number(value) <= max;
  },
  
  phone: (value) => {
    if (!value) return true;
    return PHONE_REGEX.test(value);
  }
};

/**
 * Validation helper function to validate a field against multiple rules
 * 
 * @param {string|number} value - The field value to validate
 * @param {Array} rules - Array of validation rules to apply
 * @param {Object} formValues - All form values (for match validation)
 * @returns {Object} - Object with isValid flag and error message
 */
export const validateField = (value, rules, formValues = {}) => {
  // Default to valid
  let isValid = true;
  let errorMessage = '';
  
  // Process each rule
  for (const rule of rules) {
    // Handle different rule formats
    if (typeof rule === 'function') {
      // Rule is a direct validation function
      isValid = rule(value, formValues);
      if (!isValid) {
        errorMessage = 'Invalid value';
        break;
      }
    } else if (typeof rule === 'object') {
      // Rule is an object with validator and message
      const { validator, message } = rule;
      isValid = validator(value, formValues);
      if (!isValid) {
        errorMessage = message || 'Invalid value';
        break;
      }
    }
  }
  
  return { isValid, errorMessage };
};

/**
 * Validate a complete form with multiple fields
 * 
 * @param {Object} formValues - Object with form field values
 * @param {Object} validationSchema - Schema defining validation rules for each field
 * @returns {Object} - Object with form validity, errors by field, and first error message
 */
export const validateForm = (formValues, validationSchema) => {
  const errors = {};
  let isValid = true;
  let firstError = '';
  
  // Validate each field in the schema
  for (const [fieldName, rules] of Object.entries(validationSchema)) {
    const value = formValues[fieldName];
    const { isValid: fieldIsValid, errorMessage } = validateField(value, rules, formValues);
    
    if (!fieldIsValid) {
      errors[fieldName] = errorMessage;
      isValid = false;
      
      // Store the first error message
      if (!firstError) {
        firstError = errorMessage;
      }
    }
  }
  
  return { isValid, errors, firstError };
};

export default { validators, validateField, validateForm }; 