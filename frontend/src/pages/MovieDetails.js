import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import tmdbApi from '../api/tmdbApi';
import { useAuth } from '../hooks/useAuth';
import VideoPlayer from '../components/VideoPlayer';
import moviePlaceholder from '../assets/images/movie-placeholder';

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, checkSubscription } = useAuth();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);

  useEffect(() => {
    // Scroll to top only when component first mounts
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [id]); // Only re-run if movie id changes
    
  useEffect(() => {
    // Check if user has subscription access
    const checkAccess = async () => {
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }
      
      // Admins and superadmins always have access
      if (user.role === 'admin' || user.role === 'superadmin') {
        setHasAccess(true);
        return;
      }
      
      // Real-time check of subscription/access code validity with expiry validation
      const hasValidSubscription = await checkSubscription();
      
      if (!hasValidSubscription) {
        console.log('User does not have a valid subscription or access code. Redirecting to subscriptions page...');
        navigate('/subscriptions');
        return;
      }
      
      // Differentiate between subscription and access code for analytics
      if (user.hasSubscription) {
        console.log(`User accessing content with subscription plan: ${user.subscriptionPlan?.name}`);
      } else if (user.hasAccessCode) {
        console.log(`User accessing content with access code from: ${user.accessCodeDetails?.ownerUsername}`);
      }
      
      setHasAccess(true);
    };
    
    checkAccess();
  }, [isAuthenticated, user, navigate, checkSubscription]);

  useEffect(() => {
    // Only fetch movie details if user has access
    if (!hasAccess) return;
    
    const fetchMovieDetails = async () => {
      try {
        setLoading(true);
        // Use tmdbApi directly for movie details instead of backendApi
        const movieData = await tmdbApi.getMovieDetails(id);
        
        if (!movieData) {
          throw new Error('Movie details not found');
        }
        
        setMovie(movieData);
        
        // Find trailer video key if available
        if (movieData.videos && movieData.videos.results && movieData.videos.results.length > 0) {
          // Find official trailer first
          const trailer = movieData.videos.results.find(video => 
            video.type === 'Trailer' && video.site === 'YouTube' && video.official === true
          ) || 
          // Then any trailer
          movieData.videos.results.find(video => 
            video.type === 'Trailer' && video.site === 'YouTube'
          ) || 
          // Then any teaser
          movieData.videos.results.find(video => 
            video.type === 'Teaser' && video.site === 'YouTube'
          ) ||
          // Or first video
          movieData.videos.results.find(video => video.site === 'YouTube');
          
          if (trailer) {
            setTrailerKey(trailer.key);
          }
        }
        
        // Fetch similar movies using tmdbApi
        const similarData = await tmdbApi.getSimilarMovies(id);
        setSimilarMovies(similarData?.slice(0, 6) || []);
      } catch (err) {
        console.error('Error fetching movie details:', err);
        setError('Failed to load movie details. Please try again later.');
        
        // Set dummy data for development/preview
        setMovie({
          id: parseInt(id),
          title: 'Sample Movie Title',
          poster_path: moviePlaceholder,
          backdrop_path: moviePlaceholder,
          release_date: '2023-05-15',
          runtime: 120,
          vote_average: 8.5,
          vote_count: 1250,
          genres: [{ id: 1, name: 'Action' }, { id: 2, name: 'Thriller' }, { id: 3, name: 'Sci-Fi' }],
          overview: 'This is a sample movie overview. It would normally contain a description of the movie plot and other relevant information about the film.',
          credits: {
            crew: [{ job: 'Director', name: 'John Director' }],
            cast: [
              { name: 'Actor One', character: 'Character 1' },
              { name: 'Actor Two', character: 'Character 2' },
              { name: 'Actor Three', character: 'Character 3' },
              { name: 'Actor Four', character: 'Character 4' }
            ]
          }
        });
        
        setSimilarMovies(Array(6).fill().map((_, idx) => ({
          id: 1000 + idx,
          title: `Similar Movie ${idx + 1}`,
          poster_path: moviePlaceholder,
          vote_average: (Math.random() * 2 + 7).toFixed(1)
        })));
      } finally {
        setLoading(false);
      }
    };
    
    fetchMovieDetails();
  }, [id, hasAccess]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">
        <div className="text-xl p-8 rounded-lg">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p>Loading movie details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!movie && !loading) {
    return (
      <div className="container mx-auto px-4 py-12 bg-gray-900 text-white">
        <div className="bg-red-900 border border-red-600 text-white px-4 py-3 rounded mb-6">
          Movie not found or has been removed.
        </div>
        <Link to="/browse" className="text-red-600 hover:underline">
          &larr; Back to Browse
        </Link>
      </div>
    );
  }

  // Helper to get image URL or fallback to the URL if it's already a full URL
  const getImageWithFallback = (path, size = 'original') => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return tmdbApi.getImageUrl(path, size);
  };

  // Extract director from credits if available
  const director = movie.credits?.crew?.find(person => person.job === 'Director')?.name || 'Unknown';
  
  // Extract cast members
  const cast = movie.credits?.cast?.slice(0, 10) || [];

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8">
      {showTrailer && (
        <VideoPlayer 
          videoKey={trailerKey} 
          title={movie?.title || 'Movie Trailer'} 
          onClose={() => setShowTrailer(false)} 
        />
      )}
      
      {/* Movie Backdrop */}
      <div className="relative">
        <div 
          className="aspect-[21/9] bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${getImageWithFallback(movie.backdrop_path)})`,
            backgroundPosition: 'center 20%' 
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-90" />
        </div>
      </div>
      
      {/* Movie Content */}
      <div className="container mx-auto px-4 py-12">
        {error && (
          <div className="bg-red-900 border border-red-600 text-white px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Movie Poster */}
          <div className="md:w-1/3 lg:w-1/4 mb-8 md:mb-0">
            <img 
              src={getImageWithFallback(movie.poster_path, 'w500')} 
              alt={movie.title} 
              className="w-full rounded-lg shadow-lg"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = moviePlaceholder;
              }}
            />
          </div>
          
          {/* Movie Info */}
          <div className="md:w-2/3 lg:w-3/4">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{movie.title}</h1>
            
            <div className="flex items-center mb-4 text-sm text-gray-400">
              <span className="mr-4">{new Date(movie.release_date).getFullYear()}</span>
              {movie.runtime && <span className="mr-4">{movie.runtime} min</span>}
              <span className="flex items-center text-yellow-500">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                </svg>
                {movie.vote_average?.toFixed(1)} ({movie.vote_count?.toLocaleString()} votes)
              </span>
            </div>
            
            <div className="mb-6">
              {movie.genres && movie.genres.map((genre) => (
                <span 
                  key={genre.id} 
                  className="inline-block bg-gray-800 rounded-full px-3 py-1 text-sm font-semibold text-gray-300 mr-2 mb-2"
                >
                  {genre.name}
                </span>
              ))}
            </div>
            
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2">Overview</h2>
              <p className="text-gray-300">{movie.overview}</p>
            </div>
            
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2">Director</h2>
              <p className="text-gray-300">{director}</p>
            </div>
            
            {cast.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">Cast</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {cast.map((actor, index) => (
                    <div key={index} className="text-gray-300">
                      <span className="font-medium">{actor.name}</span>
                      {actor.character && (
                        <span className="block text-sm text-gray-400">as {actor.character}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => navigate(-1)}
                className="text-white bg-gray-800 hover:bg-gray-900 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Browse
              </button>
              
              {trailerKey && (
                <button
                  onClick={() => setShowTrailer(true)}
                  className="text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Watch Trailer
                </button>
              )}
            </div>
          </div>
        </div>
        
        {similarMovies.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6">Similar Movies You Might Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {similarMovies.map((similarMovie) => (
                <Link to={`/movie/${similarMovie.id}`} key={similarMovie.id} className="group">
                  <div className="relative overflow-hidden rounded-lg mb-2 aspect-[2/3] bg-gray-800">
                    <img
                      src={getImageWithFallback(similarMovie.poster_path, 'w500')}
                      alt={similarMovie.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = moviePlaceholder;
                      }}
                    />
                    <div className="absolute top-0 right-0 bg-black bg-opacity-75 text-yellow-400 p-1 text-sm rounded-bl">
                      ★ {similarMovie.vote_average}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <span className="text-white font-medium">View Details</span>
                    </div>
                  </div>
                  <h3 className="font-medium truncate text-gray-300 group-hover:text-white transition-colors">
                    {similarMovie.title}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieDetails; 