import React, { useState, useEffect } from 'react';
import { setupTokenRefresh, getDashboardStats } from '../../api/backendApi';
import { useAuth } from '../../hooks/useAuth';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    userStats: {
      total_users: 0,
      superadmin_count: 0,
      admin_count: 0,
      user_count: 0,
      active_users_last_week: 0
    },
    subscriptionStats: {
      total_subscriptions: 0,
      active_subscriptions: 0,
      users_with_subscription: 0
    },
    subscription_plans: [],
    access_code_stats: {
      total_codes: 0,
      used_codes: 0,
      available_codes: 0
    },
    recent_registrations: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFrame, setTimeFrame] = useState('week');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setupTokenRefresh();
        const response = await getDashboardStats();
        
        if (response && response.data) {
          const responseData = response.data;
          setStats({
            userStats: responseData.user_stats || {
              total_users: 0,
              superadmin_count: 0,
              admin_count: 0,
              user_count: 0,
              active_users_last_week: 0
            },
            subscriptionStats: responseData.subscription_stats || {
              total_subscriptions: 0,
              active_subscriptions: 0,
              users_with_subscription: 0
            },
            subscription_plans: responseData.subscription_plans || [],
            access_code_stats: responseData.access_code_stats || {
              total_codes: 0,
              used_codes: 0,
              available_codes: 0
            },
            recent_registrations: responseData.recent_registrations || []
          });
        } else {
          throw new Error('Invalid response format from API');
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getValue = (obj, path, defaultValue = 0) => {
    if (!obj) return defaultValue;
    const properties = path.split('.');
    return properties.reduce((acc, prop) => {
      return acc && acc[prop] !== undefined ? acc[prop] : defaultValue;
    }, obj);
  };

  // Calculate active subscription percentage
  const activeSubscriptionPercentage = () => {
    const total = getValue(stats, 'subscriptionStats.total_subscriptions');
    const active = getValue(stats, 'subscriptionStats.active_subscriptions');
    return total > 0 ? Math.round((active / total) * 100) : 0;
  };

  // Format large numbers with commas
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Loading dashboard data...</div>
        </div>
      </div>
    );
  }

  // Get day names for chart
  const getDayLabels = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      result.push(days[date.getDay()]);
    }
    
    return result;
  };

  // Generate sample data for the chart based on recent registrations
  const generateChartData = () => {
    const dayLabels = getDayLabels();
    const data = Array(7).fill(0);
    
    if (Array.isArray(stats.recent_registrations)) {
      const today = new Date();
      
      stats.recent_registrations.forEach(reg => {
        if (!reg.date) return;
        
        const regDate = new Date(reg.date);
        const diffTime = Math.abs(today - regDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 6) {
          data[6 - diffDays] = reg.count || 0;
        }
      });
    }
    
    return { labels: dayLabels, data };
  };

  const chartData = generateChartData();

  return (
    <div className="bg-gray-50 min-h-screen pb-12 mt-14">
      {/* Dashboard Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Overview of your platform's performance and metrics
              </p>
            </div>
            
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button 
                onClick={() => setTimeFrame('week')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  timeFrame === 'week' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Week
              </button>
              <button 
                onClick={() => setTimeFrame('month')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  timeFrame === 'month' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Month
              </button>
              <button 
                onClick={() => setTimeFrame('year')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  timeFrame === 'year' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Year
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* User Stats Card */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-medium text-gray-700">Total Users</h2>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatNumber(getValue(stats, 'userStats.total_users'))}
              </div>
              {user?.role === 'superadmin' ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {formatNumber(getValue(stats, 'userStats.active_users_last_week'))} active users this week
                  </span>
                  <div className="flex items-center text-green-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                    </svg>
                    <span>4.3%</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Platform members
                </div>
              )}
            </div>
          </div>
          
          {/* Subscription Stats Card */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-medium text-gray-700">Subscriptions</h2>
                <span className="p-2 bg-green-50 text-green-600 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatNumber(getValue(stats, 'subscriptionStats.total_subscriptions'))}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {activeSubscriptionPercentage()}% active rate
                </span>
                <div className="flex items-center text-green-600">
                  <div className="w-20 h-2 bg-gray-200 rounded-full mr-2">
                    <div 
                      className="h-full bg-green-500 rounded-full" 
                      style={{ width: `${activeSubscriptionPercentage()}%` }}
                    ></div>
                  </div>
                  <span>{formatNumber(getValue(stats, 'subscriptionStats.active_subscriptions'))}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Access Codes Card */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-medium text-gray-700">Access Codes</h2>
                <span className="p-2 bg-yellow-50 text-yellow-600 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v-1l1-1 1-1-1.257-1.257A6 6 0 1118 8zm-6-4a1 1 0 10-2 0 2 2 0 012 0z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatNumber(getValue(stats, 'access_code_stats.total_codes'))}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {formatNumber(getValue(stats, 'access_code_stats.used_codes'))} codes redeemed
                </span>
                <div className="flex items-center text-blue-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                  </svg>
                  <span>{formatNumber(getValue(stats, 'access_code_stats.available_codes'))} available</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recent Registrations Card */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-medium text-gray-700">New Users</h2>
                <span className="p-2 bg-purple-50 text-purple-600 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatNumber(Array.isArray(stats.recent_registrations) 
                  ? stats.recent_registrations.reduce((sum, reg) => sum + (reg.count || 0), 0)
                  : 0
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  Last 30 days
                </span>
                <div className="flex items-center text-purple-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                  <span>12.7%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Registration Chart */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-800">User Registrations</h2>
                  <div className="flex space-x-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                      <span className="text-xs text-gray-500">New Users</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="h-64 flex items-end space-x-2">
                  {chartData.data.map((value, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-red-500 hover:bg-red-600 transition-colors rounded-t-sm"
                        style={{ 
                          height: `${value > 0 ? (value / Math.max(...chartData.data)) * 180 : 4}px`,
                          minHeight: '4px'
                        }}
                      ></div>
                      <div className="text-xs text-gray-500 mt-2">{chartData.labels[index]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Subscription Plans Distribution */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-lg font-medium text-gray-800">Subscription Plans</h2>
              </div>
              {Array.isArray(stats.subscription_plans) && stats.subscription_plans.length > 0 ? (
                <div className="px-6 py-4">
                  <div className="space-y-4">
                    {stats.subscription_plans.map((plan, index) => {
                      const totalCount = stats.subscription_plans.reduce((sum, p) => sum + (p.count || 0), 0);
                      const percentage = totalCount > 0 ? ((plan.count || 0) / totalCount) * 100 : 0;
                      
                      return (
                        <div key={plan.plan_name || index} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <span className="text-lg font-semibold text-gray-900">{plan.plan_name || 'Unnamed Plan'}</span>
                              <span className="ml-2 text-sm text-gray-500">{formatNumber(plan.count || 0)} users</span>
                            </div>
                            <span className="text-sm font-medium text-gray-700">₹{(plan.total_revenue || 0) * 75}</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <div className="text-right mt-1">
                            <span className="text-xs text-gray-500">{percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="px-6 py-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No active subscription plans found</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Right column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-lg font-medium text-gray-800">Quick Actions</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {user?.role === 'superadmin' && (
                    <a href="/admin/users" className="block w-full py-2 px-4 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Manage Users
                    </a>
                  )}
                  <a href="/admin/subscriptions" className="block w-full py-2 px-4 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Manage Subscriptions
                  </a>
                  <a href="/admin/content" className="block w-full py-2 px-4 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                    Manage Content
                  </a>
                </div>
              </div>
            </div>
            
            {/* Role Distribution */}
            {user?.role === 'superadmin' && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                  <h2 className="text-lg font-medium text-gray-800">User Roles</h2>
                </div>
                <div className="p-6">
                  <div className="flex justify-center">
                    <div className="relative w-40 h-40">
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        {/* Superadmin slice */}
                        <path 
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                          fill="none" 
                          stroke="#facc15" 
                          strokeWidth="2" 
                          strokeDasharray={`${getValue(stats, 'userStats.superadmin_count') / getValue(stats, 'userStats.total_users') * 100}, 100`}
                          strokeDashoffset="0"
                        />
                        {/* Admin slice */}
                        <path 
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                          fill="none" 
                          stroke="#ef4444" 
                          strokeWidth="2" 
                          strokeDasharray={`${getValue(stats, 'userStats.admin_count') / getValue(stats, 'userStats.total_users') * 100}, 100`}
                          strokeDashoffset={`${100 - (getValue(stats, 'userStats.superadmin_count') / getValue(stats, 'userStats.total_users') * 100)}`}
                        />
                        {/* Users slice */}
                        <path 
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                          fill="none" 
                          stroke="#3b82f6" 
                          strokeWidth="2" 
                          strokeDasharray={`${getValue(stats, 'userStats.user_count') / getValue(stats, 'userStats.total_users') * 100}, 100`}
                          strokeDashoffset={`${100 - ((getValue(stats, 'userStats.superadmin_count') + getValue(stats, 'userStats.admin_count')) / getValue(stats, 'userStats.total_users') * 100)}`}
                        />
                        {/* Middle text */}
                        <text x="18" y="20" className="text-lg font-semibold" textAnchor="middle" fill="#4b5563">
                          {formatNumber(getValue(stats, 'userStats.total_users'))}
                        </text>
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">Users</span>
                      </div>
                      <span className="text-sm font-medium text-gray-800">{formatNumber(getValue(stats, 'userStats.user_count'))}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">Admins</span>
                      </div>
                      <span className="text-sm font-medium text-gray-800">{formatNumber(getValue(stats, 'userStats.admin_count'))}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">Superadmins</span>
                      </div>
                      <span className="text-sm font-medium text-gray-800">{formatNumber(getValue(stats, 'userStats.superadmin_count'))}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Platform Health */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-lg font-medium text-gray-800">Platform Health</h2>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">User Engagement</span>
                      <span className="text-sm font-medium text-gray-800">76%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full" 
                        style={{ width: '76%' }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Subscription Rate</span>
                      <span className="text-sm font-medium text-gray-800">62%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: '62%' }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Content Growth</span>
                      <span className="text-sm font-medium text-gray-800">89%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full" 
                        style={{ width: '89%' }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 