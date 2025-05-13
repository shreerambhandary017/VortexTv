import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jwtDecode from 'jwt-decode';
import { setupTokenRefresh, storeAuthToken, clearAuthToken, getCurrentUser, register as registerApi, login as loginApi, checkSubscription as checkSubscriptionApi, generateAccessCode as generateAccessCodeApi, redeemAccessCode as redeemAccessCodeApi, getAccessCodes as getAccessCodesApi } from '../api/backendApi';

// Create auth context
export const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  // Check if user is already logged in on mount
  useEffect(() => {
    console.log("AuthContext mounted - checking login status");
    checkUserLoggedIn();
    
    // Listen for storage events (e.g., token changes in other tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        if (e.newValue) {
          console.log('Token updated in another tab - refreshing auth state');
          checkUserLoggedIn();
        } else {
          console.log('Token removed in another tab - logging out');
          handleLogout();
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Handle logout process
  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    clearAuthToken();
  };

  // Check if token exists and is valid
  const checkUserLoggedIn = async () => {
    setIsLoading(true);
    console.log("Checking if user is logged in...");
    
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log("No token found - user is not logged in");
      setIsLoading(false);
      return;
    }
    
    try {
      // Check if token is expired
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
      if (decoded.exp < currentTime) {
        console.log("Token expired - logging out");
        clearAuthToken();
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      console.log("Token is valid - refreshing auth state");
      
      // Ensure token is set in headers
      setupTokenRefresh();
      
      // First check if we have cached subscription data
      let cachedSubscriptionData = null;
      try {
        const cachedData = localStorage.getItem('vortextv_subscription_data');
        if (cachedData) {
          cachedSubscriptionData = JSON.parse(cachedData);
          console.log("Found cached subscription data:", cachedSubscriptionData);
        }
      } catch (cacheError) {
        console.error("Error reading cached subscription data:", cacheError);
      }
      
      try {
        // Get current user data
        console.log("Fetching current user data");
        const response = await getCurrentUser();
        console.log("User data retrieved successfully", response.data);
        
        // Merge subscription data from cache into user object if available
        let userData = response.data;
        if (cachedSubscriptionData) {
          userData = {
            ...userData,
            hasSubscription: cachedSubscriptionData.hasSubscription,
            hasAccessCode: cachedSubscriptionData.hasAccessCode,
            subscription: cachedSubscriptionData.subscription,
            subscriptionPlan: cachedSubscriptionData.subscriptionPlan,
            subscriptionStatus: cachedSubscriptionData.status,
            subscriptionExpiry: cachedSubscriptionData.expiryDate,
            generatedCodes: cachedSubscriptionData.generatedCodes || 0,
            maxAllowedCodes: cachedSubscriptionData.maxAllowedCodes || 0,
            remainingCodes: cachedSubscriptionData.remainingCodes || 0,
            accessCodeDetails: cachedSubscriptionData.accessCodeDetails
          };
          console.log("Merged cached subscription data with user data");
        }
        
        setUser(userData);
        setIsAuthenticated(true);
        
        // Immediately after auth is established, trigger a subscription check in background
        // This will update the cached data with fresh data from the server
        setTimeout(() => {
          console.log("Performing background subscription check after login");
          checkSubscription().then(() => {
            console.log("Background subscription check completed");
          }).catch(err => {
            console.error("Background subscription check failed:", err);
          });
        }, 200);
      } catch (error) {
        console.error('Error fetching user data:', error);
        
        // If we can't get user data but have a valid token,
        // try to extract basic info from the token itself
        try {
          const tokenData = {
            user_id: decoded.sub,
            role: decoded.role
          };
          console.log("Using token data as fallback:", tokenData);
          
          // Merge with cached subscription data if available
          if (cachedSubscriptionData) {
            Object.assign(tokenData, {
              hasSubscription: cachedSubscriptionData.hasSubscription,
              hasAccessCode: cachedSubscriptionData.hasAccessCode,
              subscription: cachedSubscriptionData.subscription,
              subscriptionPlan: cachedSubscriptionData.subscriptionPlan,
              subscriptionStatus: cachedSubscriptionData.status,
              subscriptionExpiry: cachedSubscriptionData.expiryDate,
              generatedCodes: cachedSubscriptionData.generatedCodes || 0,
              maxAllowedCodes: cachedSubscriptionData.maxAllowedCodes || 0,
              remainingCodes: cachedSubscriptionData.remainingCodes || 0,
              accessCodeDetails: cachedSubscriptionData.accessCodeDetails
            });
            console.log("Merged cached subscription data with token data");
          }
          
          setUser(tokenData);
          setIsAuthenticated(true);
          
          // Try to get fresh subscription data
          setTimeout(() => checkSubscription(), 300);
        } catch (tokenError) {
          console.error('Failed to extract user data from token:', tokenError);
          clearAuthToken();
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('Error decoding/validating token:', error);
      clearAuthToken();
      setUser(null);
      setIsAuthenticated(false);
    }
    
    setIsLoading(false);
  };

  // Register user
  const register = async (formData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Attempting to register with:', { 
        username: formData.username,
        email: formData.email,
        password: formData.password ? '*****' : 'empty'
      });
      
      const response = await registerApi(formData);
      console.log('Registration response:', response.data);
      
      const token = response.data.token;
      console.log('Token received:', token ? `${token.substring(0, 15)}...` : 'No token');
      
      if (!token) {
        setError('Registration successful but no authentication token received');
        setIsLoading(false);
        return false;
      }
      
      // Store token consistently
      storeAuthToken(token);
      
      // Set user data from the response
      const userData = {
        user_id: response.data.user_id,
        username: response.data.username || formData.username,
        email: response.data.email || formData.email,
        role: response.data.role || 'user' // Default role for new registrations
      };
      
      setUser(userData);
      setIsAuthenticated(true);
      
      navigate('/subscriptions');
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.response?.data?.message || 'Registration failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Login user
  const login = async (credentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Attempting login with credentials:', { 
        username: credentials.username, 
        password: credentials.password ? '*****' : 'empty' 
      });
      
      // Clear any existing tokens before login attempt
      clearAuthToken();
      
      // Use backendApi which has token interceptor setup
      const response = await loginApi(credentials);
      console.log('Login response received:', { status: response.status });
      
      const token = response.data.token;
      console.log('Token received:', token ? `${token.substring(0, 15)}...` : 'No token');
      
      if (!token) {
        console.error('No token received in login response');
        setError('Authentication failed: No token received');
        setIsLoading(false);
        return false;
      }
      
      // Store token consistently
      storeAuthToken(token);
      
      try {
        // Get current user data after login with proper authorization header
        console.log('Fetching user data after login');
        const userResponse = await getCurrentUser();
        
        console.log('User data received:', userResponse.data);
        const userData = userResponse.data;
        setUser(userData);
        setIsAuthenticated(true);
        
        // Redirect based on user role
        if (userData.role === 'admin' || userData.role === 'superadmin') {
          navigate('/admin');
        } else {
          navigate('/browse');
        }
        
        return true;
      } catch (userError) {
        console.error('Error fetching user data after login:', userError);
        
        // Even if user fetch fails, we're still logged in with a token
        // Set minimal user data based on the login response
        const minimalUserData = {
          user_id: response.data.user_id,
          username: response.data.username,
          email: response.data.email,
          role: response.data.role
        };
        
        console.log('Setting minimal user data:', minimalUserData);
        setUser(minimalUserData);
        setIsAuthenticated(true);
        
        // Redirect based on role from login response
        if (response.data.role === 'admin' || response.data.role === 'superadmin') {
          navigate('/admin');
        } else {
          navigate('/browse');
        }
        
        return true;
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Enhanced error logging
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
        setError(error.response.data.message || 'Login failed');
      } else if (error.request) {
        console.error('Error request:', error.request);
        setError('No response received from server. Please try again later.');
      } else {
        console.error('Error message:', error.message);
        setError(error.message || 'Login failed');
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    handleLogout();
    navigate('/login');
  };

  // Check if user has active subscription
  const checkSubscription = async () => {
    if (!isAuthenticated) {
      console.log('Not authenticated, cannot check subscription');
      return false;
    }
    
    // Add a retry mechanism for reliability
    let retries = 2;
    let success = false;
    let finalResponse = null;
    
    while (retries >= 0 && !success) {
      try {
        console.log(`Checking subscription (${2-retries}/2 attempt)`);
        const response = await checkSubscriptionApi();
        success = true;
        finalResponse = response;
        console.log('Subscription check successful:', response.data);
      } catch (error) {
        console.error(`Attempt ${2-retries}/2 failed:`, error);
        retries--;
        if (retries >= 0) {
          // Wait before retrying (500ms, then 1000ms)
          await new Promise(resolve => setTimeout(resolve, 500 * (3 - retries)));
        }
      }
    }
    
    if (!success || !finalResponse) {
      console.error('All subscription check attempts failed');
      
      // Try to use cached data if available
      const cachedSubscription = localStorage.getItem('vortextv_subscription_data');
      if (cachedSubscription) {
        try {
          const parsedData = JSON.parse(cachedSubscription);
          console.log('Using cached subscription data:', parsedData);
          
          // Update user with cached data
          setUser(prevUser => ({
            ...prevUser,
            hasSubscription: parsedData.hasSubscription,
            hasAccessCode: parsedData.hasAccessCode,
            subscription: parsedData.subscription,
            subscriptionPlan: parsedData.subscriptionPlan,
            subscriptionStatus: parsedData.status,
            subscriptionExpiry: parsedData.expiryDate,
            generatedCodes: parsedData.generatedCodes || 0,
            maxAllowedCodes: parsedData.maxAllowedCodes || 0,
            remainingCodes: parsedData.remainingCodes || 0,
            accessCodeDetails: parsedData.accessCodeDetails
          }));
          
          return parsedData.hasSubscription && parsedData.status === 'active';
        } catch (e) {
          console.error('Error parsing cached subscription data:', e);
        }
      }
      
      return false;
    }
    
    const data = finalResponse.data;
    
    // Cache the subscription data for later use if needed
    localStorage.setItem('vortextv_subscription_data', JSON.stringify(data));
    
    // Update user data with subscription info
    setUser(prevUser => ({
      ...prevUser,
      hasSubscription: data.hasSubscription,
      hasAccessCode: data.hasAccessCode,
      subscription: data.subscription,
      // Add more detailed subscription data
      subscriptionPlan: data.subscriptionPlan,
      subscriptionStatus: data.status,
      subscriptionExpiry: data.expiryDate,
      generatedCodes: data.generatedCodes || 0,
      maxAllowedCodes: data.maxAllowedCodes || 0,
      remainingCodes: data.remainingCodes || 0,
      accessCodeDetails: data.accessCodeDetails
    }));
    
    // Check if subscription is active (not expired)
    const isActive = data.hasSubscription && 
                    data.status === 'active' && 
                    new Date(data.expiryDate) > new Date();
    
    // Or check if access code is valid
    const hasValidCode = data.hasAccessCode &&
                        data.accessCodeDetails &&
                        new Date(data.accessCodeDetails.expiryDate) > new Date();
    
    const result = isActive || hasValidCode;
    console.log(`Subscription check result: ${result ? 'Active' : 'Inactive'}`);
    return result;
  };

  // Generate an access code for the user's subscription
  const generateAccessCode = async () => {
    setIsLoading(true);
    console.log('AuthContext: Starting access code generation');
    
    // Make sure subscription data is up-to-date before generating
    try {
      if (!isAuthenticated) {
        console.error('AuthContext: Cannot generate code - not authenticated');
        setError('Authentication required');
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      // Check subscription status directly from user object
      if (!user) {
        console.error('AuthContext: Cannot generate code - no user data');
        setError('User data unavailable');
        return {
          success: false,
          error: 'User data unavailable'
        };
      }
      
      if (!user.hasSubscription) {
        console.error('AuthContext: Cannot generate code - no active subscription');
        setError('No active subscription found');
        return {
          success: false,
          error: 'No active subscription found'
        };
      }

      // Debug the request before sending
      console.log('AuthContext: Making API call to generate access code');
      
      // Make the API request with specific headers and timeout
      const response = await generateAccessCodeApi();
      console.log('AuthContext: Access code API response:', response.data);

      if (response.data && response.data.success) {
        const successMsg = `Access code generated: ${response.data.code}`;
        console.log('AuthContext: ' + successMsg);
        setSuccess(successMsg);
        
        // Update subscription data in user context
        setUser(prevUser => ({
          ...prevUser,
          remainingCodes: response.data.remainingCodes,
          generatedCodes: response.data.generatedCodes
        }));
        
        // Return the generated code data
        return response.data;
      } else {
        const errorMsg = response.data?.error || 'Failed to generate access code';
        console.error('AuthContext: Access code generation failed:', errorMsg);
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    } catch (err) {
      console.error('AuthContext: Error generating access code:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to generate access code';
      setError(errorMsg);
      return {
        success: false,
        error: errorMsg,
        details: err.toString()
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Redeem an access code
  const redeemAccessCode = async (code) => {
    setIsLoading(true);
    try {
      if (!isAuthenticated) {
        setError('Authentication required');
        return false;
      }

      const response = await redeemAccessCodeApi(code);

      if (response.data && response.data.success) {
        setSuccess('Access code redeemed successfully');
        // Update user's subscription status after redemption
        await checkSubscription();
        return response.data.accessCodeDetails;
      } else {
        setError(response.data.error || 'Failed to redeem access code');
        return null;
      }
    } catch (err) {
      console.error('Error redeeming access code:', err);
      setError(err.response?.data?.error || 'Failed to redeem access code');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Get all user generated access codes
  const getUserAccessCodes = async () => {
    // Guard clause - check if authenticated and has subscription
    if (!isAuthenticated) {
      console.log('Not authenticated, cannot get access codes');
      return { success: false, codes: [], error: 'Authentication required' };
    }
    
    if (!user || !user.hasSubscription) {
      console.log('User has no subscription, cannot get access codes');
      return { success: false, codes: [], error: 'No active subscription' };
    }
    
    try {
      console.log('Fetching access codes from API');
      const response = await getAccessCodesApi();
      
      // Validate the response structure
      if (response && response.data) {
        // Check if codes array exists, if not default to empty array
        const codes = Array.isArray(response.data.codes) ? response.data.codes : 
                     (Array.isArray(response.data) ? response.data : []);
        
        console.log(`Retrieved ${codes.length} access codes`);
        return { success: true, codes: codes };
      } else {
        console.error('Invalid response format from access codes API');
        return { success: false, codes: [], error: 'Invalid response format' };
      }
    } catch (error) {
      console.error('Error fetching access codes:', error);
      return { 
        success: false, 
        codes: [], 
        error: error.response?.data?.message || error.message || 'Error fetching access codes'
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        success,
        register,
        login,
        logout,
        checkSubscription,
        generateAccessCode,
        redeemAccessCode,
        getUserAccessCodes,
        refreshAuth: checkUserLoggedIn // Expose this to allow manual refresh
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 