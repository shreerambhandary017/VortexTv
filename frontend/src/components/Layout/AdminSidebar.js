import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSidebar } from '../../App';

const AdminSidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { isCollapsed, toggleSidebar } = useSidebar();
  
  // Check if current path is active
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  // Create a reusable menu link component with enhanced hover effects
  const MenuLink = ({ to, isActive, icon, text, isCollapsed }) => {
    return (
      <Link
        to={to}
        className={`
          flex items-center py-3 px-4 rounded-md group relative
          ${isActive ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
          transition-all duration-200 ${isCollapsed ? 'justify-center' : ''}
        `}
        title={text}
      >
        <span className={`text-xl ${isCollapsed ? 'transform group-hover:scale-110 transition-transform' : 'mr-3'}`}>{icon}</span>
        {!isCollapsed ? (
          <span>{text}</span>
        ) : (
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap">
            {text}
          </div>
        )}
      </Link>
    );
  };
  
  return (
    <div 
      className={`bg-gray-900 text-white fixed left-0 top-14 h-[calc(100vh-3.5rem)] overflow-y-auto z-10 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Toggle button at the top */}
      <div className="flex justify-end px-2 py-3">
        <button 
          onClick={toggleSidebar}
          className="bg-red-600 hover:bg-red-700 rounded-md p-2 text-white transition-all duration-200 shadow-md hover:shadow-lg"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <div className="transition-transform duration-300">
            {isCollapsed ? (
              // Hamburger menu icon when collapsed
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            ) : (
              // Close/X icon when expanded
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
        </button>
      </div>
      
      <div className={`px-4 py-2 ${isCollapsed ? 'text-center' : ''}`}>
        {!isCollapsed && <h2 className="text-xl font-bold text-red-600 mb-6">Admin Panel</h2>}
        
        {!isCollapsed && (
          <div className="mb-6">
            <div className="text-gray-400 mb-2 text-sm">Logged in as:</div>
            <div className="font-medium truncate">{user?.username}</div>
            <div className="text-sm text-gray-400">{user?.role}</div>
          </div>
        )}
        
        <nav className="space-y-2">
          <MenuLink 
            to="/admin" 
            isActive={isActive('/admin')} 
            icon="📊" 
            text="Dashboard" 
            isCollapsed={isCollapsed} 
          />
          
          {user?.role === 'superadmin' && (
            <MenuLink 
              to="/admin/users" 
              isActive={isActive('/admin/users')} 
              icon="👥" 
              text="Users" 
              isCollapsed={isCollapsed} 
            />
          )}
          
          <MenuLink 
            to="/admin/content" 
            isActive={isActive('/admin/content')} 
            icon="🎬" 
            text="Content" 
            isCollapsed={isCollapsed} 
          />
          
          <MenuLink 
            to="/admin/subscriptions" 
            isActive={isActive('/admin/subscriptions')} 
            icon="💳" 
            text="Subscriptions" 
            isCollapsed={isCollapsed} 
          />
        </nav>
      </div>
      
      <div className={`px-4 py-4 mt-auto ${isCollapsed ? 'text-center' : ''}`}>
        <Link
          to="/browse"
          className={`
            flex items-center py-3 px-4 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md
            transition-all duration-200 ${isCollapsed ? 'justify-center' : ''} group relative
          `}
          title="Back to Site"
        >
          <span className={`text-xl ${isCollapsed ? 'transform group-hover:scale-110 transition-transform' : 'mr-3'}`}>🏠</span>
          {!isCollapsed ? (
            <span>Back to Site</span>
          ) : (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap">
              Back to Site
            </div>
          )}
        </Link>
      </div>
    </div>
  );
};

export default AdminSidebar; 