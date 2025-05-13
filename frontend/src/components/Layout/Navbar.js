import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import tmdbApi from '../../api/tmdbApi';
import moviePlaceholder from '../../assets/images/movie-placeholder';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const showSearchBar = location.pathname === '/browse' || location.pathname === '/movies' || location.pathname === '/tvshows';

  // For debouncing search requests
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Add scroll event listener
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    // Add event listener
    window.addEventListener('scroll', handleScroll);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Update search suggestions when query changes with debouncing
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout to debounce API calls
    const timeout = setTimeout(async () => {
      try {
        // Get search suggestions using our dedicated API method
        const suggestions = await tmdbApi.getSearchSuggestions(searchQuery);
        setSearchSuggestions(suggestions);
        setShowSuggestions(searchFocused && suggestions.length > 0);
      } catch (err) {
        console.error('Error fetching search suggestions:', err);
        setSearchSuggestions([]);
      }
    }, 300); // Wait 300ms after typing stops
    
    setSearchTimeout(timeout);
    
    // Clean up function
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery, searchFocused]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchFocused(false);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    navigate(`/${suggestion.type}/${suggestion.id}`);
    setSearchQuery('');
    setSearchFocused(false);
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSuggestions && !event.target.closest('.search-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  return (
    <>
      <nav 
        className={`${
          scrolled 
            ? 'bg-gray-900/90 backdrop-blur-lg shadow-lg py-1' 
            : 'bg-gradient-to-r from-gray-900 to-gray-800 py-2'
        } text-white fixed top-0 left-0 right-0 z-50 transition-all duration-300`}
      >
        <div className="container mx-auto px-4 flex justify-between items-center h-14">
          <div className="flex items-center">
            <Link 
              to={isAuthenticated ? "/browse" : "/"} 
              className={`${
                scrolled ? 'text-lg' : 'text-xl'
              } font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-600 transition-all duration-300 flex items-center group`}
            >
              <div className="transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-1.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="tracking-tight">VortexTV</span>
            </Link>
            
            {isAuthenticated && (
              <div className="ml-8 space-x-6 hidden md:flex">
                <Link to="/browse" className={`relative px-3 py-1.5 rounded-lg overflow-hidden group ${location.pathname === '/browse' ? 'text-white font-medium' : 'text-gray-300'}`}>
                  <span className="relative z-10 transition-colors duration-300 group-hover:text-white">Browse</span>
                  <span className={`absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${location.pathname === '/browse' ? 'opacity-20' : ''}`}></span>
                  <span className={`absolute bottom-0 left-0 h-0.5 bg-red-500 transition-all duration-300 ${location.pathname === '/browse' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                </Link>
                <Link to="/movies" className={`relative px-3 py-1.5 rounded-lg overflow-hidden group ${location.pathname === '/movies' || location.pathname.startsWith('/movie/') ? 'text-white font-medium' : 'text-gray-300'}`}>
                  <span className="relative z-10 transition-colors duration-300 group-hover:text-white">Movies</span>
                  <span className={`absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${location.pathname === '/movies' || location.pathname.startsWith('/movie/') ? 'opacity-20' : ''}`}></span>
                  <span className={`absolute bottom-0 left-0 h-0.5 bg-red-500 transition-all duration-300 ${location.pathname === '/movies' || location.pathname.startsWith('/movie/') ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                </Link>
                <Link to="/tvshows" className={`relative px-3 py-1.5 rounded-lg overflow-hidden group ${location.pathname === '/tvshows' || location.pathname.startsWith('/tv/') ? 'text-white font-medium' : 'text-gray-300'}`}>
                  <span className="relative z-10 transition-colors duration-300 group-hover:text-white">TV Shows</span>
                  <span className={`absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${location.pathname === '/tvshows' || location.pathname.startsWith('/tv/') ? 'opacity-20' : ''}`}></span>
                  <span className={`absolute bottom-0 left-0 h-0.5 bg-red-500 transition-all duration-300 ${location.pathname === '/tvshows' || location.pathname.startsWith('/tv/') ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                </Link>
                {!(user?.role === 'admin' || user?.role === 'superadmin') && (
                  <Link to="/subscriptions" className={`relative px-3 py-1.5 rounded-lg overflow-hidden group ${location.pathname === '/subscriptions' ? 'text-white font-medium' : 'text-gray-300'}`}>
                    <span className="relative z-10 transition-colors duration-300 group-hover:text-white">Subscriptions</span>
                    <span className={`absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${location.pathname === '/subscriptions' ? 'opacity-20' : ''}`}></span>
                    <span className={`absolute bottom-0 left-0 h-0.5 bg-red-500 transition-all duration-300 ${location.pathname === '/subscriptions' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                  </Link>
                )}
                {(user?.role === 'admin' || user?.role === 'superadmin') && (
                  <Link to="/admin" className={`relative px-3 py-1.5 rounded-lg overflow-hidden group ${location.pathname.startsWith('/admin') ? 'text-white font-medium' : 'text-gray-300'}`}>
                    <span className="relative z-10 transition-colors duration-300 group-hover:text-white">Admin Panel</span>
                    <span className={`absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${location.pathname.startsWith('/admin') ? 'opacity-20' : ''}`}></span>
                    <span className={`absolute bottom-0 left-0 h-0.5 bg-red-500 transition-all duration-300 ${location.pathname.startsWith('/admin') ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                  </Link>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Search bar - visible on browse, movies and tvshows pages */}
            {isAuthenticated && showSearchBar && (
              <div className="search-container relative hidden sm:block">
                <form 
                  onSubmit={handleSearch} 
                  className={`relative transition-all duration-300 ${
                    searchFocused ? 'w-64 md:w-72' : 'w-44 md:w-56'
                  }`}
                >
                  <input
                    type="text"
                    placeholder="Search movies & shows..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => {
                      // Delay hiding suggestions to allow for clicks
                      setTimeout(() => {
                        if (!document.activeElement.closest('.search-suggestions')) {
                          setSearchFocused(false);
                        }
                      }, 200);
                    }}
                    className={`bg-gray-800/80 text-white px-3 py-1.5 pr-9 rounded-full w-full focus:outline-none focus:ring-1 transition-all duration-300 ${
                      searchFocused 
                        ? 'focus:ring-red-500 bg-gray-800/95 shadow-md' 
                        : 'focus:ring-gray-700'
                    } text-sm placeholder-gray-400`}
                  />
                  <button 
                    type="submit" 
                    className={`absolute right-2.5 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${
                      searchQuery.trim() ? 'text-red-500' : 'text-gray-400'
                    } hover:text-red-500`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </form>
                
                {/* Search suggestions */}
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-2 z-50 max-h-80 overflow-auto">
                    {searchSuggestions.map((suggestion) => (
                      <div
                        key={`${suggestion.type}-${suggestion.id}`}
                        className="px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <div className="w-10 h-14 flex-shrink-0 mr-3 bg-gray-900 rounded overflow-hidden">
                          {suggestion.poster_path ? (
                            <img 
                              src={`https://image.tmdb.org/t/p/w92${suggestion.poster_path}`}
                              alt={suggestion.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = moviePlaceholder;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-700 text-xs text-gray-400">No Image</div>
                          )}
                        </div>
                        <div className="flex-1 truncate">
                          <span className="font-medium">{suggestion.title}</span>
                          <span className="text-gray-400 text-xs ml-1">({suggestion.year})</span>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-gray-700 my-1"></div>
                    <button
                      className="w-full px-3 py-1.5 text-center text-xs text-red-400 hover:text-red-300 font-medium"
                      onClick={handleSearch}
                    >
                      View all results
                    </button>
                  </div>
                )}
              </div>
            )}

            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link 
                  to="/profile" 
                  className="group relative flex items-center text-gray-300 hover:text-white transition-colors duration-300"
                >
                  <div className="flex items-center">
                    <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-full p-1 mr-1.5 shadow-sm transition-transform duration-300 transform group-hover:scale-110">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="hidden sm:inline text-sm font-medium">Profile</span>
                  </div>
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-red-500 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <button 
                  onClick={logout}
                  className="flex items-center bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-3.5 py-1.5 rounded-full transition-all duration-300 text-xs font-medium shadow-md hover:shadow-lg transform hover:translate-y-[-1px]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="relative group text-gray-300 text-sm font-medium transition-colors duration-300 hover:text-white">
                  Login
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-red-500 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link to="/register" className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-3.5 py-1.5 rounded-full transition-all duration-300 text-xs font-medium shadow-md hover:shadow-lg transform hover:translate-y-[-1px]">
                  Register
                </Link>
              </div>
            )}
            
            {/* Mobile menu button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center"
              aria-label="Toggle menu"
            >
              <div className="w-5 h-5 flex flex-col justify-between items-center relative">
                <span className={`bg-white block h-0.5 w-full rounded-sm transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                <span className={`bg-white block h-0.5 w-full rounded-sm transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                <span className={`bg-white block h-0.5 w-full rounded-sm transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
              </div>
            </button>
          </div>
        </div>
      </nav>
      
      {/* Mobile menu dropdown */}
      <div 
        className={`fixed inset-x-0 top-12 z-40 bg-gray-900/95 backdrop-blur-lg transform transition-transform duration-300 shadow-lg ${
          mobileMenuOpen ? 'translate-y-0' : '-translate-y-full'
        } md:hidden`}
      >
        <div className="container mx-auto px-4 py-3">
          {isAuthenticated && (
            <div className="flex flex-col space-y-3 border-b border-gray-700 pb-3">
              <Link 
                to="/browse" 
                className={`relative px-3 py-2 rounded-lg overflow-hidden group ${location.pathname === '/browse' ? 'text-white font-medium' : 'text-gray-300'}`}
              >
                <span className="relative z-10 transition-colors duration-300 group-hover:text-white">Browse</span>
                <span className={`absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${location.pathname === '/browse' ? 'opacity-10' : ''}`}></span>
                <span className={`absolute left-0 top-0 bottom-0 w-1 bg-red-500 transition-all duration-300 ${location.pathname === '/browse' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></span>
              </Link>
              <Link 
                to="/movies" 
                className={`relative px-3 py-2 rounded-lg overflow-hidden group ${location.pathname === '/movies' || location.pathname.startsWith('/movie/') ? 'text-white font-medium' : 'text-gray-300'}`}
              >
                <span className="relative z-10 transition-colors duration-300 group-hover:text-white">Movies</span>
                <span className={`absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${location.pathname === '/movies' || location.pathname.startsWith('/movie/') ? 'opacity-10' : ''}`}></span>
                <span className={`absolute left-0 top-0 bottom-0 w-1 bg-red-500 transition-all duration-300 ${location.pathname === '/movies' || location.pathname.startsWith('/movie/') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></span>
              </Link>
              <Link 
                to="/tvshows" 
                className={`relative px-3 py-2 rounded-lg overflow-hidden group ${location.pathname === '/tvshows' || location.pathname.startsWith('/tv/') ? 'text-white font-medium' : 'text-gray-300'}`}
              >
                <span className="relative z-10 transition-colors duration-300 group-hover:text-white">TV Shows</span>
                <span className={`absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${location.pathname === '/tvshows' || location.pathname.startsWith('/tv/') ? 'opacity-10' : ''}`}></span>
                <span className={`absolute left-0 top-0 bottom-0 w-1 bg-red-500 transition-all duration-300 ${location.pathname === '/tvshows' || location.pathname.startsWith('/tv/') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></span>
              </Link>
              {!(user?.role === 'admin' || user?.role === 'superadmin') && (
                <Link 
                  to="/subscriptions" 
                  className={`relative px-3 py-2 rounded-lg overflow-hidden group ${location.pathname === '/subscriptions' ? 'text-white font-medium' : 'text-gray-300'}`}
                >
                  <span className="relative z-10 transition-colors duration-300 group-hover:text-white">Subscriptions</span>
                  <span className={`absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${location.pathname === '/subscriptions' ? 'opacity-10' : ''}`}></span>
                  <span className={`absolute left-0 top-0 bottom-0 w-1 bg-red-500 transition-all duration-300 ${location.pathname === '/subscriptions' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></span>
                </Link>
              )}
              {(user?.role === 'admin' || user?.role === 'superadmin') && (
                <Link 
                  to="/admin" 
                  className={`relative px-3 py-2 rounded-lg overflow-hidden group ${location.pathname.startsWith('/admin') ? 'text-white font-medium' : 'text-gray-300'}`}
                >
                  <span className="relative z-10 transition-colors duration-300 group-hover:text-white">Admin Panel</span>
                  <span className={`absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${location.pathname.startsWith('/admin') ? 'opacity-10' : ''}`}></span>
                  <span className={`absolute left-0 top-0 bottom-0 w-1 bg-red-500 transition-all duration-300 ${location.pathname.startsWith('/admin') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></span>
                </Link>
              )}
            </div>
          )}
          
          {isAuthenticated && showSearchBar && (
            <div className="py-3 border-b border-gray-700">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search movies & shows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-800 text-white px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                />
                <button 
                  type="submit" 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </form>
            </div>
          )}
          
          <div className="pt-3 flex flex-col space-y-3">
            {isAuthenticated ? (
              <>
                <Link 
                  to="/profile" 
                  className="flex items-center px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  My Profile
                </Link>
                <button 
                  onClick={logout}
                  className="flex items-center px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors text-left"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="flex items-center px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Helper component for navigation links
const NavLink = ({ to, current, children }) => {
  return (
    <Link 
      to={to} 
      className={`relative group text-sm ${current ? 'text-white font-medium' : 'text-gray-300 hover:text-white'} transition-colors duration-300`}
    >
      <span className="tracking-wide">{children}</span>
      <span 
        className={`absolute -bottom-1 left-0 h-0.5 bg-red-500 transition-all duration-300 ${
          current ? 'w-full' : 'w-0 group-hover:w-full'
        }`}
      ></span>
    </Link>
  );
};

// Add CSS for the suggestions animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translate3d(0, -10px, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }
  
  .animate-suggestions {
    animation: fadeInDown 0.2s ease-out forwards;
  }
  
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translate3d(-10px, 0, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }
`;
document.head.appendChild(style);

export default Navbar; 