import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

const Subscriptions = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscribing, setSubscribing] = useState(false);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const { isAuthenticated, user, checkSubscription } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect admin and superadmin users away from the subscriptions page
    if (isAuthenticated && user && (user.role === 'admin' || user.role === 'superadmin')) {
      navigate('/browse');
      return;
    }
    
    fetchSubscriptionPlans();
    if (isAuthenticated) {
      fetchUserSubscription();
    }
  }, [isAuthenticated, user, navigate]);

  const fetchSubscriptionPlans = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/subscriptions/plans');
      setPlans(response.data);
    } catch (err) {
      setError('Failed to load subscription plans. Please try again later.');
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSubscription = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/subscriptions/me');
      setActiveSubscription(response.data);
    } catch (err) {
      // Only set error if it's not a 404 (no subscription found)
      if (err.response && err.response.status !== 404) {
        setError('Failed to load your subscription. Please try again later.');
        console.error('Error fetching user subscription:', err);
      }
    }
  };

  const handleSubscribe = async (planId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      setSubscribing(true);
      await axios.post('http://localhost:5000/api/subscriptions', { plan_id: planId });
      
      // Update user subscription status
      await checkSubscription();
      
      // Fetch the updated subscription
      await fetchUserSubscription();
      
      // Navigate to browse page
      navigate('/browse');
    } catch (err) {
      setError('Failed to process subscription. Please try again later.');
      console.error('Error subscribing:', err);
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setSubscribing(true);
      await axios.delete('http://localhost:5000/api/subscriptions/me');
      setActiveSubscription(null);
      await checkSubscription();
    } catch (err) {
      setError('Failed to cancel subscription. Please try again later.');
      console.error('Error cancelling subscription:', err);
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen pt-20 pb-10">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-10 w-64 bg-gray-200 rounded mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="bg-gray-100 rounded-lg shadow w-72 h-96"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 pt-24 pb-16 px-4 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 tracking-tight">
            Choose Your <span className="text-red-600">Premium Plan</span>
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
            Get unlimited access to our entire library of movies and TV shows with a VortexTV subscription.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-12 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg shadow-sm animate-fade-in">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {activeSubscription && (
          <div className="max-w-2xl mx-auto mb-16 bg-white border border-gray-200 p-8 rounded-xl shadow-md animate-fade-in transition duration-300 hover:shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Your Current Subscription
            </h2>
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <p className="text-xl font-semibold text-gray-800 mb-2">{activeSubscription.plan_name}</p>
              <p className="text-gray-700 flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Expires on: {new Date(activeSubscription.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-gray-700 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Status: <span className={activeSubscription.is_active ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {activeSubscription.is_active ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
            <button
              onClick={handleCancelSubscription}
              disabled={subscribing}
              className="flex items-center justify-center w-full md:w-auto px-6 py-3 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              {subscribing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel Subscription
                </>
              )}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <div 
              key={plan.plan_id} 
              className={`bg-white rounded-2xl shadow-md flex flex-col transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden ${
                plan.plan_name === 'Standard' ? 'md:scale-105 z-10' : ''
              }`}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {plan.plan_name === 'Standard' && (
                <div className="absolute -right-12 top-6 bg-red-600 text-white px-10 py-1 transform rotate-45 shadow-md">
                  <span className="font-bold">POPULAR</span>
                </div>
              )}
              
              <div className={`px-8 py-6 border-b ${plan.plan_name === 'Standard' ? 'bg-red-50 border-red-100' : 'border-gray-100'}`}>
                <h3 className={`text-2xl font-bold ${plan.plan_name === 'Standard' ? 'text-red-600' : 'text-gray-900'}`}>
                  {plan.plan_name}
                </h3>
                <div className="mt-4 flex items-end">
                  <span className="text-4xl font-bold text-gray-900">₹{plan.price}</span>
                  <span className="ml-2 text-sm font-normal text-gray-600">/month</span>
                </div>
              </div>
              
              <div className="px-8 py-6 flex-grow">
                <p className="text-gray-700 mb-6 leading-relaxed">{plan.description}</p>
                
                <ul className="mb-8 flex-grow space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-gray-800">
                      <span className="mr-2 text-green-500 bg-green-50 p-1 rounded-full flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {/* Access Code Information */}
                <div className="mb-6 bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                  <div className="flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                    </svg>
                    <h4 className="font-semibold text-indigo-800">Access Code Sharing</h4>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-indigo-700">
                      Share with up to <span className="font-bold text-xl">{plan.max_access_codes || 0}</span> friends
                    </div>
                    {plan.max_access_codes > 0 && (
                      <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                        {plan.max_access_codes} {plan.max_access_codes === 1 ? 'code' : 'codes'}
                      </div>
                    )}
                  </div>
                </div>
                
              </div>
              
              <div className="px-8 pb-8">
                <button
                  onClick={() => handleSubscribe(plan.plan_id)}
                  disabled={subscribing || (activeSubscription && activeSubscription.plan_name === plan.plan_name)}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
                    activeSubscription && activeSubscription.plan_name === plan.plan_name
                      ? 'bg-green-600 text-white cursor-default'
                      : plan.plan_name === 'Standard'
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg'
                        : 'bg-gray-800 hover:bg-gray-900 text-white'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 ${plan.plan_name === 'Standard' ? 'focus:ring-red-500' : 'focus:ring-gray-500'}`}
                >
                  {subscribing
                    ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </div>
                    )
                    : activeSubscription && activeSubscription.plan_name === plan.plan_name
                    ? (
                      <div className="flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Current Plan
                      </div>
                    )
                    : 'Select Plan'
                  }
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-6 text-gray-900 text-center">All Plans Include:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center mb-4">
                <div className="bg-red-100 p-3 rounded-lg mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-gray-900">No Contracts</h4>
                  <p className="text-gray-700 mt-1">Cancel anytime, no hidden fees</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center mb-4">
                <div className="bg-red-100 p-3 rounded-lg mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-gray-900">All Content</h4>
                  <p className="text-gray-700 mt-1">Access to thousands of titles</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center mb-4">
                <div className="bg-red-100 p-3 rounded-lg mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-gray-900">No Ads</h4>
                  <p className="text-gray-700 mt-1">Uninterrupted streaming experience</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-16 text-center">
          <p className="text-gray-600 max-w-2xl mx-auto">
            By subscribing to VortexTV, you agree to our 
            <a href="/terms" className="text-red-600 hover:text-red-700 transition-colors"> Terms of Service </a> 
            and 
            <a href="/privacy" className="text-red-600 hover:text-red-700 transition-colors"> Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

// Add this CSS class for smooth fade-in animation
const styles = document.createElement('style');
styles.innerHTML = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fadeIn 0.5s ease-out forwards;
  }
`;
document.head.appendChild(styles);

export default Subscriptions; 