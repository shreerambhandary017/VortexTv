import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import tmdbApi, { getImageUrl } from '../api/tmdbApi';
import moviePlaceholder from '../assets/images/movie-placeholder';
import { useAuth } from '../hooks/useAuth';
import { getAllSubscriptionPlans } from '../api/backendApi';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const [featuredContent, setFeaturedContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);

  // Fallback content to use when API is unavailable
  const fallbackContent = [
    { id: 1, type: 'movie', title: 'The Matrix', image: 'https://m.media-amazon.com/images/M/MV5BNzQzOTk3OTAtNDQ0Zi00ZTVkLWI0MTEtMDllZjNkYzNjNTc4L2ltYWdlXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_.jpg' },
    { id: 2, type: 'movie', title: 'Inception', image: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_.jpg' },
    { id: 3, type: 'tv', title: 'Breaking Bad', image: 'https://m.media-amazon.com/images/M/MV5BYmQ4YWMxYjUtNjZmYi00MDQ1LWFjMjMtNjA5ZDdiYjdiODU5XkEyXkFqcGdeQXVyMTMzNDExODE5._V1_.jpg' },
    { id: 4, type: 'tv', title: 'Stranger Things', image: 'https://m.media-amazon.com/images/M/MV5BMDZkYmVhNjMtNWU4MC00MDQxLWE3MjYtZGMzZWI1ZjhlOWJmXkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_.jpg' },
  ];

  useEffect(() => {
    const fetchFeaturedContent = async () => {
      try {
        setLoading(true);
        // Set a timeout for the API request
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API request timed out')), 5000)
        );
        
        // Fetch trending movies and popular TV shows with timeout
        const fetchDataPromise = Promise.all([
          tmdbApi.getTrendingMovies(),
          tmdbApi.getPopularTvShows()
        ]);
        
        // Race between the API request and the timeout
        const [trendingMovies, popularTVShows] = await Promise.race([
          fetchDataPromise,
          timeoutPromise.then(() => { throw new Error('Timeout'); })
        ]);

        // Combine and format the content
        const combinedContent = [
          ...trendingMovies.slice(0, 2).map(movie => ({
            id: movie.id,
            type: 'movie',
            title: movie.title,
            image: getImageUrl(movie.poster_path, 'w500')
          })),
          ...popularTVShows.slice(0, 2).map(show => ({
            id: show.id,
            type: 'tv',
            title: show.name,
            image: getImageUrl(show.poster_path, 'w500')
          }))
        ];

        setFeaturedContent(combinedContent);
        setError(null);
      } catch (err) {
        console.error('Error fetching featured content:', err);
        // Use fallback content in case of error
        setFeaturedContent(fallbackContent);
        setError('Unable to connect to the movie database. Showing sample content instead.');
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedContent();
  }, []);

  useEffect(() => {
    const fetchSubscriptionPlans = async () => {
      try {
        setPlansLoading(true);
        const response = await getAllSubscriptionPlans();
        setPlans(response.data);
      } catch (err) {
        console.error('Error fetching subscription plans:', err);
        // Set dummy data for development/preview
        setPlans([
          {
            plan_id: 1,
            plan_name: 'Basic',
            price: 599,
            duration_months: 1,
            max_access_codes: 1,
            description: 'Perfect for individuals who want to enjoy content on a single device.',
            features: ['HD streaming', 'Watch on 1 device', 'Limited content']
          },
          {
            plan_id: 2,
            plan_name: 'Standard',
            price: 999,
            duration_months: 1,
            max_access_codes: 2,
            description: 'Great for couples or small families with multiple devices.',
            features: ['Full HD streaming', 'Watch on 2 devices', 'All content']
          },
          {
            plan_id: 3,
            plan_name: 'Premium',
            price: 1499,
            duration_months: 1,
            max_access_codes: 4,
            description: 'Ultimate experience for families and enthusiasts.',
            features: ['4K Ultra HD streaming', 'Watch on 4 devices', 'Early access to new releases']
          }
        ]);
      } finally {
        setPlansLoading(false);
      }
    };

    fetchSubscriptionPlans();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-gray-900 via-black to-red-900 text-white overflow-hidden">
        {/* Background Pattern Overlay */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{ 
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', 
            backgroundSize: '20px 20px' 
          }}></div>
        </div>
        
        <div className="container mx-auto px-4 py-32 md:py-40 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-red-200">
              Welcome to VortexTV
            </h1>
            
            <p className="text-xl md:text-2xl leading-relaxed mb-10 text-gray-200">
              Your ultimate streaming platform for movies and TV shows. 
              <span className="block mt-2">Experience entertainment without limits.</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
              {!isAuthenticated && (
                <Link
                  to="/register"
                  className="w-full sm:w-auto px-10 py-4 rounded-full bg-gradient-to-r from-red-600 to-red-700 text-white font-medium text-lg transition-transform duration-300 hover:shadow-lg hover:from-red-500 hover:to-red-700 transform hover:-translate-y-1 flex justify-center items-center"
                >
                  <span>Sign Up Now</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              )}
              <Link
                to="/subscriptions"
                className="w-full sm:w-auto px-10 py-4 rounded-full bg-transparent border-2 border-white text-white font-medium text-lg transition-all duration-300 hover:bg-white hover:text-gray-900 flex justify-center items-center"
              >
                <span>View Plans</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>

            {/* Key Platform Features */}
            <div className="mt-16">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="bg-black bg-opacity-30 backdrop-filter backdrop-blur-sm rounded-xl p-6 transform transition-all duration-300 hover:scale-105 border border-gray-700">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-center mb-2">4K Streaming</h3>
                  <p className="text-gray-300 text-center text-sm">Enjoy crystal clear, ultra HD quality on all your favorite titles</p>
                </div>
                
                <div className="bg-black bg-opacity-30 backdrop-filter backdrop-blur-sm rounded-xl p-6 transform transition-all duration-300 hover:scale-105 border border-gray-700">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-center mb-2">Watch Anywhere</h3>
                  <p className="text-gray-300 text-center text-sm">Stream content on your terms, anytime and on any device</p>
                </div>
                
                <div className="bg-black bg-opacity-30 backdrop-filter backdrop-blur-sm rounded-xl p-6 transform transition-all duration-300 hover:scale-105 border border-gray-700">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-center mb-2">No Commitments</h3>
                  <p className="text-gray-300 text-center text-sm">Cancel your subscription at any time, no questions asked</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Angle at the bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" fill="#ffffff">
            <path d="M0,64L80,53.3C160,43,320,21,480,26.7C640,32,800,64,960,64C1120,64,1280,32,1360,16L1440,0L1440,80L1360,80C1280,80,1120,80,960,80C800,80,640,80,480,80C320,80,160,80,80,80L0,80Z"></path>
          </svg>
        </div>
      </div>

      {/* Featured Content Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8">Featured Content</h2>
        {error && error !== 'Unable to connect to the movie database. Showing sample content instead.' && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-[450px] mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {featuredContent.map((item) => (
              <div key={item.id} className="group">
                <div className="relative overflow-hidden rounded-lg mb-2">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = moviePlaceholder;
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                    <Link
                      to={`/${item.type}/${item.id}`}
                      className="bg-red-600 text-white px-4 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Watch Now
                    </Link>
                  </div>
                </div>
                <h3 className="font-medium">{item.title}</h3>
                <p className="text-gray-500 text-sm capitalize">{item.type}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subscription Plans Teaser */}
      <div className="bg-gradient-to-b from-gray-50 to-gray-100 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">Choose Your <span className="text-red-600">Plan</span></h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Get unlimited access to our entire library of movies and TV shows with a premium subscription.</p>
          </div>
          
          {plansLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="bg-white rounded-xl shadow-md h-[450px]">
                    <div className="h-20 bg-gray-100 rounded-t-xl"></div>
                    <div className="p-6">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/2 mb-8"></div>
                      <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan, index) => (
                <div 
                  key={plan.plan_id} 
                  className={`bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col transform hover:-translate-y-1 ${
                    plan.plan_name === 'Standard' ? 'md:scale-105 z-10 border-2 border-red-400' : ''
                  }`}
                >
                  {plan.plan_name === 'Standard' && (
                    <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      POPULAR
                    </div>
                  )}
                  
                  <div className={`p-6 border-b ${plan.plan_name === 'Standard' ? 'bg-red-50 border-red-100' : 'border-gray-100'}`}>
                    <h3 className={`text-xl font-bold ${plan.plan_name === 'Standard' ? 'text-red-600' : 'text-gray-900'}`}>
                      {plan.plan_name}
                    </h3>
                    <div className="mt-3 flex items-baseline">
                      <span className="text-3xl font-bold text-gray-900">₹{plan.price}</span>
                      <span className="text-sm text-gray-500 ml-1">/month</span>
                    </div>
                  </div>
                  
                  <div className="p-6 flex-grow flex flex-col">
                    <ul className="mb-6 flex-grow space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="inline-flex items-center justify-center flex-shrink-0 w-5 h-5 mr-2 bg-green-100 text-green-600 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Link
                      to="/subscriptions"
                      className={`w-full py-3 rounded-lg font-medium text-center transition-colors ${
                        plan.plan_name === 'Standard'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                      }`}
                    >
                      Get Started
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home; 