import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminAuditLogs = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [actionFilter, setActionFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchAuditLogs();
  }, [currentPage, perPage, actionFilter, userIdFilter, dateFilter]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      
      let url = `http://localhost:5000/api/admin/audit-logs?page=${currentPage}&per_page=${perPage}`;
      
      if (actionFilter) {
        url += `&action=${actionFilter}`;
      }
      
      if (userIdFilter) {
        url += `&user_id=${userIdFilter}`;
      }
      
      if (dateFilter) {
        url += `&date=${dateFilter}`;
      }
      
      const response = await axios.get(url);
      
      setAuditLogs(response.data.logs);
      setTotalLogs(response.data.total);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Failed to load audit logs. Please try again later.');
      
      // Set dummy data for development/preview
      const dummyLogs = Array(15).fill().map((_, idx) => ({
        log_id: idx + 1,
        user_id: Math.floor(Math.random() * 10) + 1,
        username: `user${Math.floor(Math.random() * 10) + 1}`,
        action: ['LOGIN', 'LOGOUT', 'CREATE_SUBSCRIPTION', 'UPDATE_PROFILE', 'ADD_FAVORITE'][Math.floor(Math.random() * 5)],
        details: JSON.stringify({
          ip: '192.168.1.' + Math.floor(Math.random() * 255),
          browser: ['Chrome', 'Firefox', 'Safari'][Math.floor(Math.random() * 3)],
          success: Math.random() > 0.2
        }),
        timestamp: new Date(Date.now() - (idx * 3600000 * Math.random() * 24)).toISOString()
      }));
      
      setAuditLogs(dummyLogs);
      setTotalLogs(100);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    // The actual fetch is done by the useEffect dependency
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatActionType = (action) => {
    // Convert snake_case or SCREAMING_SNAKE_CASE to Title Case With Spaces
    return action
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getActionBadgeColor = (action) => {
    const actionMap = {
      LOGIN: 'bg-blue-100 text-blue-800',
      LOGOUT: 'bg-gray-100 text-gray-800',
      CREATE_SUBSCRIPTION: 'bg-green-100 text-green-800',
      UPDATE_PROFILE: 'bg-yellow-100 text-yellow-800',
      UPDATE_SUBSCRIPTION: 'bg-purple-100 text-purple-800',
      CANCEL_SUBSCRIPTION: 'bg-red-100 text-red-800',
      CREATE_ACCESS_CODE: 'bg-indigo-100 text-indigo-800',
      ADD_FAVORITE: 'bg-pink-100 text-pink-800',
      REMOVE_FAVORITE: 'bg-orange-100 text-orange-800',
      UPDATE_PASSWORD: 'bg-teal-100 text-teal-800',
      UPDATE_ROLE: 'bg-red-100 text-red-800',
    };
    
    return actionMap[action] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIndicator = (details) => {
    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details;
      const success = parsed.success;
      
      if (success === true) {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Success
          </span>
        );
      } else if (success === false) {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Failed
          </span>
        );
      }
    } catch (e) {
      // If details can't be parsed or doesn't contain success
      return null;
    }
    
    return null;
  };

  const formatDetails = (details) => {
    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details;
      return (
        <div className="text-xs space-y-1">
          {Object.entries(parsed)
            .filter(([key]) => key !== 'success')
            .map(([key, value]) => (
              <div key={key}>
                <span className="font-medium">{key.charAt(0).toUpperCase() + key.slice(1)}:</span> {value.toString()}
              </div>
            ))}
        </div>
      );
    } catch (e) {
      return <div className="text-xs">{details}</div>;
    }
  };

  const totalPages = Math.ceil(totalLogs / perPage);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Audit Logs</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <form onSubmit={handleFilter} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="actionFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Action
            </label>
            <select
              id="actionFilter"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
            >
              <option value="">All Actions</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="CREATE_SUBSCRIPTION">Create Subscription</option>
              <option value="UPDATE_SUBSCRIPTION">Update Subscription</option>
              <option value="CANCEL_SUBSCRIPTION">Cancel Subscription</option>
              <option value="UPDATE_PROFILE">Update Profile</option>
              <option value="UPDATE_PASSWORD">Update Password</option>
              <option value="CREATE_ACCESS_CODE">Create Access Code</option>
              <option value="ADD_FAVORITE">Add Favorite</option>
              <option value="REMOVE_FAVORITE">Remove Favorite</option>
              <option value="UPDATE_ROLE">Update Role</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="userIdFilter" className="block text-sm font-medium text-gray-700 mb-1">
              User ID
            </label>
            <input
              type="text"
              id="userIdFilter"
              placeholder="Filter by user ID"
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
            />
          </div>
          
          <div>
            <label htmlFor="dateFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              id="dateFilter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
            />
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
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          
          <div className="md:col-span-2 lg:col-span-4 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </div>
      
      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        {loading ? (
          <div className="p-6 text-center">Loading audit logs...</div>
        ) : auditLogs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No audit logs found matching your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogs.map((log) => (
                  <tr key={log.log_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{log.username || `User #${log.user_id}`}</div>
                      <div className="text-xs text-gray-500">ID: {log.user_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionBadgeColor(log.action)}`}>
                        {formatActionType(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusIndicator(log.details)}
                    </td>
                    <td className="px-6 py-4">
                      {formatDetails(log.details)}
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
          Showing <span className="font-medium">{auditLogs.length > 0 ? (currentPage - 1) * perPage + 1 : 0}</span> to <span className="font-medium">{Math.min(currentPage * perPage, totalLogs)}</span> of <span className="font-medium">{totalLogs}</span> logs
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
    </div>
  );
};

export default AdminAuditLogs; 