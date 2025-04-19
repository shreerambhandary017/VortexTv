import { useState, useCallback, useEffect } from 'react';
import { validateForm, validateField } from '../utils/validation';
import { useNotification } from '../context/NotificationContext';

/**
 * Custom hook for form handling with validation
 * 
 * @param {Object} initialValues - Initial form values
 * @param {Object} validationSchema - Validation schema for form fields
 * @param {Function} onSubmit - Function to call on valid form submission
 * @param {Object} options - Additional options
 * @returns {Object} - Form state and handlers
 */
const useForm = (initialValues = {}, validationSchema = {}, onSubmit, options = {}) => {
  // Initialize form state
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // Options with defaults
  const {
    validateOnChange = true,
    validateOnBlur = true,
    showNotificationOnError = false,
    resetOnSubmit = false
  } = options;

  const { showError } = useNotification();

  // Update form validity whenever values or errors change
  useEffect(() => {
    const valid = Object.keys(errors).length === 0;
    setIsValid(valid);
  }, [errors, values]);

  // Validate the entire form
  const validateAllFields = useCallback(() => {
    const validationResult = validateForm(values, validationSchema);
    setErrors(validationResult.errors);
    return validationResult.isValid;
  }, [values, validationSchema]);

  // Validate a single field
  const validateSingleField = useCallback((name) => {
    if (!validationSchema[name]) return true;

    const { isValid, errorMessage } = validateField(
      values[name], 
      validationSchema[name], 
      values
    );

    setErrors(prev => ({
      ...prev,
      [name]: isValid ? undefined : errorMessage
    }));

    return isValid;
  }, [values, validationSchema]);

  // Handle field change
  const handleChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;
    const newValue = type === 'checkbox' ? checked : value;

    setValues(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Mark as touched
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    // Validate on change if enabled
    if (validateOnChange) {
      validateSingleField(name);
    }
  }, [validateOnChange, validateSingleField]);

  // Handle field blur
  const handleBlur = useCallback((event) => {
    const { name } = event.target;
    
    // Mark as touched
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    // Validate on blur if enabled
    if (validateOnBlur) {
      validateSingleField(name);
    }
  }, [validateOnBlur, validateSingleField]);

  // Set a field value programmatically
  const setFieldValue = useCallback((name, value, shouldValidate = true) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));

    if (shouldValidate) {
      validateSingleField(name);
    }
  }, [validateSingleField]);

  // Set a field error programmatically
  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  }, []);

  // Set a field as touched programmatically
  const setFieldTouched = useCallback((name, isTouched = true) => {
    setTouched(prev => ({
      ...prev,
      [name]: isTouched
    }));
  }, []);

  // Reset the form
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Handle form submission
  const handleSubmit = useCallback(async (event) => {
    if (event) {
      event.preventDefault();
    }

    setIsSubmitting(true);
    
    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce(
      (acc, key) => ({ ...acc, [key]: true }), 
      {}
    );
    setTouched(allTouched);

    // Validate all fields
    const isFormValid = validateAllFields();

    if (!isFormValid) {
      setIsSubmitting(false);
      
      // Show notification if enabled
      if (showNotificationOnError) {
        // Get the first error message
        const firstErrorMessage = Object.values(errors)[0];
        if (firstErrorMessage) {
          showError(firstErrorMessage);
        }
      }
      
      return;
    }

    // If onSubmit is provided, call it
    if (onSubmit) {
      try {
        await onSubmit(values);
        if (resetOnSubmit) {
          resetForm();
        }
      } catch (error) {
        // Handle submission error
        console.error('Form submission error:', error);
        if (error.fieldErrors) {
          setErrors(error.fieldErrors);
        }
      }
    }

    setIsSubmitting(false);
  }, [values, errors, onSubmit, validateAllFields, resetForm, resetOnSubmit, showNotificationOnError, showError]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    resetForm,
    validateField: validateSingleField,
    validateForm: validateAllFields
  };
};

export default useForm; 