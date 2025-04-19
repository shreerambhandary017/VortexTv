import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalSubscriptions, setTotalSubscriptions] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planFormData, setPlanFormData] = useState({
    plan_name: '',
    price: '',
    duration_months: '',
    max_access_codes: '',
    description: '',
    features: ''
  });
  const [activeTab, setActiveTab] = useState('subscriptions');

  useEffect(() => {
    if (activeTab === 'subscriptions') {
      fetchSubscriptions();
    } else {
      fetchPlans();
    }
  }, [activeTab, currentPage, perPage, searchTerm, statusFilter]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      
      let url = `http://localhost:5000/api/subscriptions/all?page=${currentPage}&per_page=${perPage}`;
      
      if (searchTerm) {
        url += `&search=${searchTerm}`;
      }
      
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }
      
      const response = await axios.get(url);
      
      setSubscriptions(response.data.subscriptions);
      setTotalSubscriptions(response.data.total);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError('Failed to load subscriptions. Please try again later.');
      
      // Set dummy data for development/preview
      const dummySubscriptions = Array(10).fill().map((_, idx) => ({
        subscription_id: idx + 1,
        user_id: 100 + idx,
        username: `user${100 + idx}`,
        email: `user${100 + idx}@example.com`,
        plan_name: ['Basic', 'Standard', 'Premium'][idx % 3],
        start_date: new Date(Date.now() - (idx * 30 * 86400000)).toISOString(),
        end_date: new Date(Date.now() + ((12 - idx) * 30 * 86400000)).toISOString(),
        is_active: idx < 8,
        payment_status: 'completed'
      }));
      
      setSubscriptions(dummySubscriptions);
      setTotalSubscriptions(100);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/subscriptions/plans');
      setPlans(response.data);
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError('Failed to load subscription plans. Please try again later.');
      
      // Set dummy data for development/preview
      setPlans([
        {
          plan_id: 1,
          plan_name: 'Basic',
          price: 599,
          duration_months: 1,
          max_access_codes: 1,
          description: 'Basic plan with limited features',
          features: ['HD streaming', 'Watch on 1 device', 'Access to limited content']
        },
        {
          plan_id: 2,
          plan_name: 'Standard',
          price: 999,
          duration_months: 1,
          max_access_codes: 2,
          description: 'Standard plan with more features',
          features: ['Full HD streaming', 'Watch on 2 devices', 'Access to all content']
        },
        {
          plan_id: 3,
          plan_name: 'Premium',
          price: 1499,
          duration_months: 1,
          max_access_codes: 4,
          description: 'Premium plan with all features',
          features: ['4K Ultra HD streaming', 'Watch on 4 devices', 'Access to all content and early releases']
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Search will be triggered by the useEffect dependency
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Format features as a semicolon-separated string
      const dataToSend = {...planFormData};
      
      // Convert multi-line text into semicolon-separated string
      if (typeof dataToSend.features === 'string') {
        dataToSend.features = dataToSend.features
          .split('\n')
          .map(feature => feature.trim())
          .filter(feature => feature !== '')
          .join(';');
      }
      
      await axios.post('http://localhost:5000/api/subscriptions/plans', dataToSend);
      
      // Clear form and close modal
      setPlanFormData({
        plan_name: '',
        price: '',
        duration_months: '',
        max_access_codes: '',
        description: '',
        features: ''
      });
      setShowCreatePlanModal(false);
      
      // Show success message
      setError(null);
      
      // Refresh plans
      fetchPlans();
    } catch (err) {
      console.error('Error creating plan:', err);
      setError('Failed to create plan. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlan = (plan) => {
    // Convert features to array if it's a string
    let featuresArray = [];
    
    if (typeof plan.features === 'string') {
      featuresArray = plan.features.split(';').filter(feature => feature.trim() !== '');
    } else if (Array.isArray(plan.features)) {
      featuresArray = plan.features;
    }
    
    setSelectedPlan(plan);
    setPlanFormData({
      plan_name: plan.plan_name || '',
      price: plan.price || '',
      duration_months: plan.duration_months || '',
      max_access_codes: plan.max_access_codes || '',
      description: plan.description || '',
      features: featuresArray.join('\n') // Use newlines for better editing
    });
    setShowEditPlanModal(true);
  };

  const handleUpdatePlan = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Format features as a semicolon-separated string
      const dataToSend = {...planFormData};
      
      // Convert multi-line text into semicolon-separated string
      if (typeof dataToSend.features === 'string') {
        dataToSend.features = dataToSend.features
          .split('\n')
          .map(feature => feature.trim())
          .filter(feature => feature !== '')
          .join(';');
      }
      
      await axios.put(`http://localhost:5000/api/subscriptions/plans/${selectedPlan.plan_id}`, dataToSend);
      
      // Clear form and close modal
      setPlanFormData({
        plan_name: '',
        price: '',
        duration_months: '',
        max_access_codes: '',
        description: '',
        features: ''
      });
      setShowEditPlanModal(false);
      setSelectedPlan(null);
      
      // Refresh plans
      fetchPlans();
    } catch (err) {
      console.error('Error updating plan:', err);
      setError('Failed to update plan. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPlanFormData({
      ...planFormData,
      [name]: value
    });
  };

  const handleDeletePlan = async (planId, planName) => {
    if (window.confirm(`Are you sure you want to delete the plan "${planName}"? This action cannot be undone.`)) {
      try {
        await axios.delete(`http://localhost:5000/api/subscriptions/plans/${planId}`);
        fetchPlans();
      } catch (err) {
        console.error('Error deleting plan:', err);
        if (err.response && err.response.data && err.response.data.message) {
          setError(err.response.data.message);
        } else {
          setError('Failed to delete plan. Please try again later.');
        }
      }
    }
  };

  const totalPages = Math.ceil(totalSubscriptions / perPage);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Subscription Management</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`${
              activeTab === 'subscriptions'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Subscriptions
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`${
              activeTab === 'plans'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Subscription Plans
          </button>
        </nav>
      </div>
      
      {activeTab === 'subscriptions' ? (
        <>
          {/* Search and Filter */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 md:items-end">
              <div className="flex-1">
                <form onSubmit={handleSearch}>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                    Search Subscriptions
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      id="search"
                      placeholder="Search by username or email"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm bg-gray-50 text-sm font-medium rounded-r-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Search
                    </button>
                  </div>
                </form>
              </div>
              
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Status
                </label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="perPage" className="block text-sm font-medium text-gray-700 mb-1">
                  Items per page
                </label>
                <select
                  id="perPage"
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Subscriptions Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            {loading ? (
              <div className="p-6 text-center">Loading subscriptions...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plan
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Start Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        End Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subscriptions.map((subscription) => (
                      <tr key={subscription.subscription_id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{subscription.username}</div>
                              <div className="text-sm text-gray-500">{subscription.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${
                            subscription.plan_name === 'Basic' ? 'text-blue-600' :
                            subscription.plan_name === 'Standard' ? 'text-green-600' :
                            subscription.plan_name === 'Premium' ? 'text-purple-600' :
                            'text-gray-900'
                          }`}>{subscription.plan_name}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(subscription.start_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(subscription.end_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            subscription.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {subscription.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{subscriptions.length > 0 ? (currentPage - 1) * perPage + 1 : 0}</span> to <span className="font-medium">{Math.min(currentPage * perPage, totalSubscriptions)}</span> of <span className="font-medium">{totalSubscriptions}</span> subscriptions
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${
                    currentPage === 1 ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                >
                  Previous
                </button>
                
                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                  // Logic for showing page numbers around current page
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                        pageNum === currentPage
                          ? 'text-red-600 bg-red-50'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${
                    currentPage === totalPages ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Plans Management */}
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => setShowCreatePlanModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Create New Plan
            </button>
          </div>
          
          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-12">Loading plans...</div>
            ) : plans.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">No subscription plans found.</div>
            ) : (
              plans.map((plan) => (
                <div key={plan.plan_id} className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-full">
                  <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-semibold text-gray-800">{plan.plan_name}</h3>
                    <div>
                      <button
                        onClick={() => handleEditPlan(plan)}
                        className="text-sm text-blue-600 hover:text-blue-800 mr-3 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.plan_id, plan.plan_name)}
                        className="text-sm text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="px-6 py-5 flex-grow">
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-gray-900">₹{typeof plan.price === 'string' ? parseFloat(plan.price).toFixed(2) : plan.price.toFixed(2)}</span>
                      <span className="text-gray-500">/month</span>
                    </div>
                    
                    <div className="space-y-4 text-gray-700">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Duration</h4>
                        <p className="mt-1">{plan.duration_months} {plan.duration_months === 1 ? 'month' : 'months'}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Max Access Codes</h4>
                        <p className="mt-1">{plan.max_access_codes}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Description</h4>
                        <p className="mt-1">{plan.description || 'No description'}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Features</h4>
                        <ul className="mt-2 space-y-2">
                          {(Array.isArray(plan.features) 
                            ? plan.features 
                            : (typeof plan.features === 'string' ? plan.features.split(';') : [])
                          ).filter(f => f && f.trim() !== '').map((feature, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-green-500 mr-2 font-bold">✓</span>
                              <span>{feature.trim()}</span>
                            </li>
                          ))}
                          {(!plan.features || (typeof plan.features === 'string' && plan.features.trim() === '') || 
                            (Array.isArray(plan.features) && plan.features.length === 0)) && 
                              <li className="text-sm text-gray-400">No features specified</li>
                          }
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
      
      {/* Create Plan Modal */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 overflow-y-auto z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreatePlan}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        Create New Subscription Plan
                      </h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="plan_name" className="block text-sm font-medium text-gray-700">
                            Plan Name
                          </label>
                          <input
                            type="text"
                            name="plan_name"
                            id="plan_name"
                            required
                            value={planFormData.plan_name}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                            Price (₹/month)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            name="price"
                            id="price"
                            required
                            value={planFormData.price}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="duration_months" className="block text-sm font-medium text-gray-700">
                            Duration (months)
                          </label>
                          <input
                            type="number"
                            name="duration_months"
                            id="duration_months"
                            required
                            value={planFormData.duration_months}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="max_access_codes" className="block text-sm font-medium text-gray-700">
                            Max Access Codes
                          </label>
                          <input
                            type="number"
                            name="max_access_codes"
                            id="max_access_codes"
                            required
                            value={planFormData.max_access_codes}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Description
                          </label>
                          <textarea
                            name="description"
                            id="description"
                            rows="3"
                            value={planFormData.description}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                          ></textarea>
                        </div>
                        
                        <div>
                          <label htmlFor="features" className="block text-sm font-medium text-gray-700">
                            Features (one per line)
                          </label>
                          <textarea
                            name="features"
                            id="features"
                            rows="5"
                            value={planFormData.features}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                            placeholder="HD streaming&#10;Watch on 1 device&#10;Access to limited content"
                          ></textarea>
                          <p className="mt-1 text-sm text-gray-500">Enter each feature on a new line</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Create Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreatePlanModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Plan Modal */}
      {showEditPlanModal && selectedPlan && (
        <div className="fixed inset-0 overflow-y-auto z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleUpdatePlan}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        Edit Subscription Plan
                      </h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="edit_plan_name" className="block text-sm font-medium text-gray-700">
                            Plan Name
                          </label>
                          <input
                            type="text"
                            name="plan_name"
                            id="edit_plan_name"
                            required
                            value={planFormData.plan_name}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="edit_price" className="block text-sm font-medium text-gray-700">
                            Price (₹/month)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            name="price"
                            id="edit_price"
                            required
                            value={planFormData.price}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="edit_duration_months" className="block text-sm font-medium text-gray-700">
                            Duration (months)
                          </label>
                          <input
                            type="number"
                            name="duration_months"
                            id="edit_duration_months"
                            required
                            value={planFormData.duration_months}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="edit_max_access_codes" className="block text-sm font-medium text-gray-700">
                            Max Access Codes
                          </label>
                          <input
                            type="number"
                            name="max_access_codes"
                            id="edit_max_access_codes"
                            required
                            value={planFormData.max_access_codes}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="edit_description" className="block text-sm font-medium text-gray-700">
                            Description
                          </label>
                          <textarea
                            name="description"
                            id="edit_description"
                            rows="3"
                            value={planFormData.description}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                          ></textarea>
                        </div>
                        
                        <div>
                          <label htmlFor="edit_features" className="block text-sm font-medium text-gray-700">
                            Features (one per line)
                          </label>
                          <textarea
                            name="features"
                            id="edit_features"
                            rows="5"
                            value={planFormData.features}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                            placeholder="HD streaming&#10;Watch on 1 device&#10;Access to limited content"
                          ></textarea>
                          <p className="mt-1 text-sm text-gray-500">Enter each feature on a new line</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Update Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditPlanModal(false);
                      setSelectedPlan(null);
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSubscriptions; 