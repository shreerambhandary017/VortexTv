import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { setupTokenRefresh, getCurrentUser, getUserSubscription, updateUser, generateAccessCode, redeemAccessCode, updatePassword, cancelSubscription } from '../api/backendApi';
 


const Profile = () => {
  const { user, isAuthenticated, logout, checkSubscription, generateAccessCode, redeemAccessCode, getUserAccessCodes } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [accessCodes, setAccessCodes] = useState([]);
  const [newAccessCode, setNewAccessCode] = useState(null);
  const [showGenCodeConfirm, setShowGenCodeConfirm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [isRedeemingCode, setIsRedeemingCode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user && (user.role === 'admin' || user.role === 'superadmin')) {
      // Redirect admin users to the admin profile
      navigate('/admin/profile');
    } else if (user) {
      setupTokenRefresh();
      fetchProfile();
      fetchSubscriptionData();
    }
  }, [isAuthenticated, navigate, user?.role]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await getCurrentUser();
      setProfile(response.data);
      setFormData({
        username: response.data.username,
        email: response.data.email
      });
    } catch (err) {
      setError('Failed to load profile information');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionData = async () => {
    try {
      // Use the enhanced checkSubscription from AuthContext
      await checkSubscription();
      
      // Get access codes if user has a subscription
      if (user.hasSubscription) {
        const codesResult = await getUserAccessCodes();
        if (codesResult.success) {
          setAccessCodes(codesResult.codes);
        }
      }
      
      // Set subscription data from user context
      setSubscriptionData({
        plan_name: user.subscriptionPlan?.name || 'No active plan',
        status: user.subscriptionStatus || 'inactive',
        is_active: user.hasSubscription && user.subscriptionStatus === 'active',
        expiry_date: user.subscriptionExpiry,
        end_date: user.subscriptionExpiry,
        max_access_codes: user.maxAllowedCodes || 0,
        remaining_codes: user.remainingCodes || 0,
        plan_price: user.subscriptionPlan?.price || 0,
        plan_duration: user.subscriptionPlan?.duration_months || 0
      });
    } catch (err) {
      console.error('Error fetching subscription data:', err);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    try {
      await updateUser(user.user_id, formData);
      setEditMode(false);
      setSuccessMessage('Profile updated successfully');
      fetchProfile();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
      console.error('Error updating profile:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGenerateAccessCode = async () => {
    try {
      setIsRedeemingCode(true);
      // Use the enhanced generateAccessCode from AuthContext
      const result = await generateAccessCode();
      
      if (result.success) {
        setNewAccessCode(result.code);
        setSuccessMessage(`Access code generated! You have ${result.remainingCodes} codes remaining.`);
        // Refresh subscription data
        fetchSubscriptionData();
      } else {
        setError(result.error || 'Failed to generate access code');
      }
      
      setIsRedeemingCode(false);
    } catch (err) {
      setError('Failed to generate access code. Please try again.');
      console.error('Error generating access code:', err);
      setIsRedeemingCode(false);
    }
  };

  const handleRedeemAccessCode = async (e) => {
    e.preventDefault();
    if (!accessCodeInput.trim()) {
      setError('Please enter a valid access code');
      return;
    }

    try {
      setIsRedeemingCode(true);
      // Use the enhanced redeemAccessCode from AuthContext
      const result = await redeemAccessCode(accessCodeInput);
      
      if (result.success) {
        setSuccessMessage(`Access code redeemed successfully! Your access will expire on ${new Date(result.expiryDate).toLocaleDateString()}.`);
        setAccessCodeInput('');
        // Refresh subscription data
        fetchSubscriptionData();
      } else {
        setError(result.error || 'Failed to redeem access code');
      }
      
      setIsRedeemingCode(false);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      setError('Failed to redeem access code. Please check the code and try again.');
      console.error('Error redeeming access code:', err);
      setIsRedeemingCode(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setSuccessMessage('Code copied to clipboard!');
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  const getRemainingCodesCount = () => {
    if (!user.hasSubscription) return 0;
    return user.remainingCodes || 0;
  };

  const canGenerateMoreCodes = () => {
    if (!user.hasSubscription) return false;
    if (user.subscriptionStatus !== 'active') return false;
    return getRemainingCodesCount() > 0;
  };

  const isSubscriptionExpired = () => {
    if (!user.subscriptionExpiry) return true;
    return new Date(user.subscriptionExpiry) < new Date();
  };

  const getAccessExpiryDate = () => {
    if (user.hasSubscription) {
      return user.subscriptionExpiry;
    } else if (user.hasAccessCode && user.accessCodeDetails) {
      return user.accessCodeDetails.expiryDate;
    }
    return null;
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Validate password
    if (passwordData.new_password.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      await updatePassword(passwordData.current_password, passwordData.new_password);
      setSuccessMessage('Password updated successfully');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      setShowPasswordForm(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password');
      console.error('Error updating password:', err);
    }
  };
  
  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCancelSubscription = async () => {
    try {
      setLoading(true);
      // Call the actual API function to cancel the subscription
      await cancelSubscription();
      setSuccessMessage('Subscription cancelled successfully');
      // Refresh data
      await fetchProfile();
      await fetchSubscriptionData();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel subscription');
      console.error('Error cancelling subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Loading your profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
          <button
            onClick={() => navigate('/browse')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md transition-colors duration-200 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Browse
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium">{error}</p>
              <button 
                onClick={() => setError(null)} 
                className="text-sm underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="font-medium">{successMessage}</p>
          </div>
        )}
        
        {newAccessCode && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-200 text-indigo-700 px-6 py-5 rounded-lg mb-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <p className="font-semibold text-lg mb-2">Access code generated successfully!</p>
                <p className="mb-2">Share this code with a friend:</p>
                <div className="flex items-center">
                  <span className="font-mono bg-white border border-indigo-200 px-4 py-2 rounded text-lg tracking-wider shadow-sm">
                    {newAccessCode}
                  </span>
                  <button 
                    onClick={() => copyToClipboard(newAccessCode)}
                    className="ml-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-2 rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setNewAccessCode(null)}
                className="mt-4 md:mt-0 text-indigo-700 hover:text-indigo-900 underline font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column - Account Info */}
          <div className="md:col-span-2">
            <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
              <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Account Information</h2>
                {!editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
              
              <div className="p-6">
                {editMode ? (
                  <form onSubmit={handleUpdateProfile}>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                          Username
                        </label>
                        <input
                          id="username"
                          name="username"
                          type="text"
                          value={formData.username}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      
                      <div className="flex justify-end space-x-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditMode(false)}
                          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Username</h3>
                        <p className="mt-1 font-medium text-gray-900">{profile?.username}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Email</h3>
                        <p className="mt-1 font-medium text-gray-900">{profile?.email}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Account Type</h3>
                        <p className="mt-1 font-medium text-gray-900 capitalize">
                          {profile?.role || 'Standard User'}
                          {subscriptionData?.is_active && 
                            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Premium</span>
                          }
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Member Since</h3>
                        <p className="mt-1 font-medium text-gray-900">
                          {profile?.created_at 
                            ? new Date(profile.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : 'N/A'}
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Last Login</h3>
                        <p className="mt-1 font-medium text-gray-900">
                          {profile?.last_login 
                            ? new Date(profile.last_login).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          
            {/* Subscription Information */}
            <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-5 text-white">
                <h2 className="text-xl font-semibold flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {subscriptionData?.is_active ? 'Your Subscription' : 'Subscription Status'}
                </h2>
              </div>
              
              <div className="p-6">
                {subscriptionData?.is_active ? (
                  <div className="space-y-6">
                    {/* Plan Header with Card-like Design */}
                    <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-6 border border-red-200 shadow-sm">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                        <div>
                          <div className="flex items-center">
                            <span className="inline-flex items-center justify-center bg-red-600 h-8 w-8 rounded-full mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                            <span className="text-2xl font-bold text-gray-800">{subscriptionData.plan_name}</span>
                          </div>
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                              </svg>
                              <p className="text-gray-700">
                                Expires on: <span className="font-medium">{new Date(subscriptionData.end_date).toLocaleDateString('en-US', {
                                  year: 'numeric', month: 'long', day: 'numeric'
                                })}</span>
                              </p>
                            </div>
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <p className="text-gray-700">
                                Status: <span className="text-green-600 font-medium">Active</span>
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancelSubscription()}
                          className="mt-4 md:mt-0 text-gray-700 hover:bg-gray-100 border border-gray-300 font-medium rounded-lg px-4 py-2 text-sm transition-colors duration-200 flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Cancel Subscription
                        </button>
                      </div>
                    </div>
                    
                    {/* Benefits Cards */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Subscription Benefits
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="bg-red-100 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </div>
                          <p className="font-medium text-gray-700 mb-1">Max Sharing</p>
                          <p className="text-3xl font-bold text-gray-900">{subscriptionData.max_access_codes}</p>
                          <p className="text-xs text-gray-600 mt-1">users</p>
                        </div>
                        
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="bg-green-100 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          </div>
                          <p className="font-medium text-gray-700 mb-1">Available Codes</p>
                          <p className="text-3xl font-bold text-gray-900">{getRemainingCodesCount()}</p>
                          <p className="text-xs text-gray-600 mt-1">remaining</p>
                        </div>
                        
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="bg-blue-100 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <p className="font-medium text-gray-700 mb-1">Active Users</p>
                          <p className="text-3xl font-bold text-gray-900">{accessCodes && accessCodes.length > 0 ? accessCodes.filter(code => code.is_active && code.used_by).length : 0}</p>
                          <p className="text-xs text-gray-600 mt-1">using your codes</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Access Codes Section - Always show, even if empty */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium text-gray-800 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            Your Access Codes
                          </h3>
                          
                          {getRemainingCodesCount() > 0 && !showGenCodeConfirm && (
                            <button
                              onClick={() => setShowGenCodeConfirm(true)}
                              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center shadow-sm text-sm"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                              </svg>
                              Generate Code
                            </button>
                          )}
                        </div>
                      </div>
                    
                      <div className="p-5">
                        {showGenCodeConfirm ? (
                          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100 text-center">
                            <p className="mb-3 text-indigo-800">Generate a new access code to share with a friend?</p>
                            <div className="flex space-x-3 justify-center">
                              <button
                                onClick={() => setShowGenCodeConfirm(false)}
                                className="bg-white text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300"
                                disabled={isRedeemingCode}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  handleGenerateAccessCode();
                                  setShowGenCodeConfirm(false);
                                }}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                                disabled={isRedeemingCode}
                              >
                                {isRedeemingCode ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generating...
                                  </>
                                ) : (
                                  'Generate Code'
                                )}
                              </button>
                            </div>
                          </div>
                        ) : accessCodes && accessCodes.length > 0 ? (
                          <ul className="divide-y divide-gray-100">
                            {accessCodes.map(code => (
                              <li key={code.code_id || code.code} className="py-4 px-2 hover:bg-gray-50 rounded-md transition-colors">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                                  <div className="flex items-start mb-2 sm:mb-0">
                                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center mr-3 ${code.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${code.is_active ? 'text-green-700' : 'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                    <div>
                                      <div className="flex items-center">
                                        <span className="font-mono bg-gray-100 px-3 py-1 rounded-md text-md font-bold tracking-wider text-gray-800">{code.code}</span>
                                        <button 
                                          onClick={() => copyToClipboard(code.code)}
                                          className="ml-2 text-gray-500 hover:text-indigo-600 p-1 rounded-full hover:bg-indigo-50 transition-colors"
                                          title="Copy to clipboard"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                          </svg>
                                        </button>
                                      </div>
                                      {code.expires_at && (
                                        <p className="text-sm text-gray-600 mt-1 flex items-center">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                          </svg>
                                          Expires: {new Date(code.expires_at).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center">
                                    <span 
                                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        code.is_active 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-gray-100 text-gray-800'
                                      }`}
                                    >
                                      {code.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                    <div className="ml-4 text-sm text-gray-700">
                                      {code.used_by 
                                        ? (
                                          <div className="flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                            </svg>
                                            <span>Used by: <span className="font-medium">{code.used_by_username || code.used_by}</span></span>
                                          </div>
                                        )
                                        : (
                                          <div className="flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                            </svg>
                                            <span>Not used yet</span>
                                          </div>
                                        )
                                      }
                                    </div>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-center py-8">
                            <div className="bg-gray-100 inline-flex h-16 w-16 rounded-full items-center justify-center mb-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                            <h4 className="text-gray-800 font-medium mb-2">No access codes generated yet</h4>
                            <p className="text-gray-600 mb-4">Generate an access code to share premium features with friends or family.</p>
                            {getRemainingCodesCount() > 0 && (
                              <button
                                onClick={() => setShowGenCodeConfirm(true)}
                                className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center shadow-sm"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                Generate Access Code
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                      <p className="text-gray-700 mb-4">You don't have an active subscription. Upgrade to access premium features or enter an access code below if you have one.</p>
                      <div className="flex flex-col sm:flex-row sm:space-x-4">
                        <button
                          onClick={() => navigate('/subscriptions')}
                          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors mb-3 sm:mb-0"
                        >
                          View Subscription Plans
                        </button>
                        <button
                          onClick={() => document.getElementById('accessCodeInput').focus()}
                          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                        >
                          Use Access Code
                        </button>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-medium text-gray-800 mb-4">Redeem Access Code</h3>
                      <p className="text-gray-600 mb-4">
                        If someone has shared their subscription with you, enter the access code below to gain premium access.
                      </p>
                      <form onSubmit={handleRedeemAccessCode} className="flex flex-col sm:flex-row sm:space-x-3">
                        <input
                          id="accessCodeInput"
                          type="text"
                          value={accessCodeInput}
                          onChange={(e) => setAccessCodeInput(e.target.value)}
                          placeholder="Enter access code"
                          className="flex-grow px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 mb-3 sm:mb-0"
                        />
                        <button
                          type="submit"
                          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex justify-center items-center"
                          disabled={isRedeemingCode || !accessCodeInput.trim()}
                        >
                          {isRedeemingCode ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Redeeming...
                            </>
                          ) : (
                            'Redeem Code'
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right column */}
          <div className="md:col-span-1">
            {/* Redeemed Access Code Information (for shared users) */}
            {user.hasAccessCode && !user.hasSubscription && user.accessCodeDetails && (
              <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
                <div className="px-6 py-5 border-b border-gray-200 bg-indigo-50">
                  <h2 className="text-xl font-semibold text-indigo-800">Shared Access</h2>
                </div>
                
                <div className="p-6">
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 mb-4 border border-indigo-100">
                    <div className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      <h3 className="font-semibold text-indigo-800">Access Code Active</h3>
                    </div>
                    <p className="text-indigo-700 text-sm mb-1">
                      You have premium access through a shared code
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Access Code</p>
                      <div className="flex items-center">
                        <span className="font-mono bg-indigo-50 px-3 py-1 rounded border border-indigo-100 text-indigo-700">
                          {user.accessCodeDetails.code}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Shared By</p>
                      <p className="font-medium text-gray-800">
                        {user.accessCodeDetails.ownerUsername || "Premium Subscriber"}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Expiration Date</p>
                      <p className="font-medium text-gray-800">
                        {new Date(user.accessCodeDetails.expiryDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      {new Date(user.accessCodeDetails.expiryDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
                        <p className="text-xs text-red-600 mt-1">
                          Expires soon. Consider subscribing to maintain access.
                        </p>
                      )}
                    </div>
                    
                    <div className="pt-2">
                      <button
                        onClick={() => navigate('/subscriptions')}
                        className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                        </svg>
                        Get Your Own Subscription
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Active Access Codes Panel */}
            {accessCodes && accessCodes.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800">Your Access Codes</h2>
                </div>
                
                <div className="p-4">
                  <ul className="divide-y divide-gray-200">
                    {accessCodes.map(code => (
                      <li key={code.code_id || code.code} className="py-3">
                        <div className="flex justify-between">
                          <div>
                            <div className="flex items-center">
                              <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">{code.code}</span>
                              <button 
                                onClick={() => copyToClipboard(code.code)}
                                className="ml-1 text-gray-500 hover:text-gray-700"
                                title="Copy to clipboard"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                </svg>
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {code.expires_at && `Expires: ${new Date(code.expires_at).toLocaleDateString()}`}
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                            <span 
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                code.is_active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {code.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">
                              {code.used_by 
                                ? `Used by: ${code.used_by_username || code.used_by}`
                                : 'Not used'
                              }
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {/* Account Actions */}
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Account Actions</h2>
              </div>
              
              <div className="p-6">
                <div className="space-y-3">
                  {showPasswordForm ? (
                    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                      <h3 className="text-lg font-medium text-gray-800 mb-4">Change Password</h3>
                      <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div>
                          <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 mb-1">
                            Current Password
                          </label>
                          <input
                            id="current_password"
                            name="current_password"
                            type="password"
                            value={passwordData.current_password}
                            onChange={handlePasswordInputChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-1">
                            New Password
                          </label>
                          <input
                            id="new_password"
                            name="new_password"
                            type="password"
                            value={passwordData.new_password}
                            onChange={handlePasswordInputChange}
                            required
                            minLength={8}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                          />
                          <p className="mt-1 text-xs text-gray-500">Password must be at least 8 characters long</p>
                        </div>
                        
                        <div>
                          <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm New Password
                          </label>
                          <input
                            id="confirm_password"
                            name="confirm_password"
                            type="password"
                            value={passwordData.confirm_password}
                            onChange={handlePasswordInputChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                          />
                        </div>
                        
                        <div className="flex justify-end space-x-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowPasswordForm(false)}
                            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                          >
                            Update Password
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPasswordForm(true)}
                      className="w-full bg-gray-100 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v-1l1-1 1-1-1.257-1.257A6 6 0 1118 8zm-6-4a1 1 0 10-2 0 2 2 0 012 0z" clipRule="evenodd" />
                      </svg>
                      Change Password
                    </button>
                  )}
                  
                  <button
                    onClick={logout}
                    className="w-full bg-gray-100 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zm6.293 11.293a1 1 0 001.414 1.414l4-4a1 1 0 000-1.414l-4-4a1 1 0 00-1.414 1.414L11.586 9H5a1 1 0 000 2h6.586l-2.293 2.293z" clipRule="evenodd" />
                    </svg>
                    Log Out
                  </button>
                  
                  <button
                    className="w-full text-red-700 px-4 py-2 rounded-md border border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 