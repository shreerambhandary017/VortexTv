import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Footer = () => {
  const { user, isAuthenticated } = useAuth();
  const currentYear = new Date().getFullYear();
  
  // Function to scroll to top when clicking on Home
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  return (
    <footer className="bg-gray-900 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold text-red-600 mb-4">VortexTV</h3>
            <p className="text-gray-400">
              Your ultimate streaming platform for movies and TV shows.
              Enjoy unlimited content with our subscription plans.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/" onClick={scrollToTop} className="text-gray-400 hover:text-red-500 transition-colors">Home</Link></li>
              <li><Link to="/browse" onClick={scrollToTop} className="text-gray-400 hover:text-red-500 transition-colors">Browse</Link></li>
              {!(user?.role === 'admin' || user?.role === 'superadmin') && (
                <li><Link to="/subscriptions" onClick={scrollToTop} className="text-gray-400 hover:text-red-500 transition-colors">Subscriptions</Link></li>
              )}
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><Link to="#" onClick={scrollToTop} className="text-gray-400 hover:text-red-500 transition-colors">Terms of Service</Link></li>
              <li><Link to="#" onClick={scrollToTop} className="text-gray-400 hover:text-red-500 transition-colors">Privacy Policy</Link></li>
              <li><Link to="#" onClick={scrollToTop} className="text-gray-400 hover:text-red-500 transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-400">
          <p>&copy; {currentYear} VortexTV. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 