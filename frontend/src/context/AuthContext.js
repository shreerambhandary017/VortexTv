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
      
      try {
        // Get current user data
        console.log("Fetching current user data");
        const response = await getCurrentUser();
        console.log("User data retrieved successfully", response.data);
        
        setUser(response.data);
        setIsAuthenticated(true);
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
          
          setUser(tokenData);
          setIsAuthenticated(true);
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
    if (!isAuthenticated) return false;
    
    try {
      const response = await checkSubscriptionApi();
      
      // Update user data with subscription info
      setUser(prevUser => ({
        ...prevUser,
        hasSubscription: response.data.hasSubscription,
        hasAccessCode: response.data.hasAccessCode,
        subscription: response.data.subscription,
        // Add more detailed subscription data
        subscriptionPlan: response.data.subscriptionPlan,
        subscriptionStatus: response.data.status,
        subscriptionExpiry: response.data.expiryDate,
        generatedCodes: response.data.generatedCodes || 0,
        maxAllowedCodes: response.data.maxAllowedCodes || 0,
        remainingCodes: response.data.remainingCodes || 0,
        accessCodeDetails: response.data.accessCodeDetails
      }));
      
      // Check if subscription is active (not expired)
      const isActive = response.data.hasSubscription && 
                       response.data.status === 'active' && 
                       new Date(response.data.expiryDate) > new Date();
      
      // Or check if access code is valid
      const hasValidCode = response.data.hasAccessCode &&
                           response.data.accessCodeDetails &&
                           new Date(response.data.accessCodeDetails.expiryDate) > new Date();
      
      return isActive || hasValidCode;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return false;
    }
  };

  // Generate an access code for the user's subscription
  const generateAccessCode = async () => {
    setIsLoading(true);
    try {
      if (!isAuthenticated) {
        setError('Authentication required');
        return null;
      }

      const response = await generateAccessCodeApi();

      if (response.data && response.data.success) {
        setSuccess(`Access code generated: ${response.data.code}`);
        // Return the generated code data
        return response.data;
      } else {
        setError(response.data.error || 'Failed to generate access code');
        return null;
      }
    } catch (err) {
      console.error('Error generating access code:', err);
      setError(err.response?.data?.error || 'Failed to generate access code');
      return null;
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
    if (!isAuthenticated || !user.hasSubscription) {
      return { success: false, codes: [] };
    }
    
    try {
      const response = await getAccessCodesApi();
      return { success: true, codes: response.data.codes };
    } catch (error) {
      console.error('Error fetching access codes:', error);
      return { success: false, codes: [] };
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