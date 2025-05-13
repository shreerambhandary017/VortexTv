import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import tmdbApi from '../api/tmdbApi';
import { useAuth } from '../hooks/useAuth';
import moviePlaceholder from '../assets/images/movie-placeholder';

const Movies = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [sortBy, setSortBy] = useState('popularity.desc');

  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Validate access based on authentication
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Fetch genres
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await tmdbApi.getMovieGenres();
        setGenres(response);
      } catch (err) {
        console.error('Error fetching genres:', err);
      }
    };

    fetchGenres();
  }, []);

  // Fetch movies
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        const params = {
          page,
          sort_by: sortBy
        };

        if (selectedGenre) {
          params.with_genres = selectedGenre;
        }

        const data = await tmdbApi.discoverMovies(params);
        
        setMovies(data.results);
        setTotalPages(data.total_pages > 100 ? 100 : data.total_pages);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching movies:', err);
        setError('Failed to load movies. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchMovies();
  }, [page, selectedGenre, sortBy]);

  const handleGenreChange = (genreId) => {
    setSelectedGenre(genreId);
    setPage(1);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setPage(1);
  };

  // Helper function to get image URL
  const getImageUrl = (path, size = 'w500') => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  if (loading && page === 1) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">
        <div className="text-xl p-8 rounded-lg">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p>Loading movies...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-20 px-4 md:px-6">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-3xl font-bold mb-6 md:mb-0">Movies</h1>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            {/* Genre filter */}
            <div className="relative bg-gray-800 rounded-lg shadow">
              <select
                className="appearance-none w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                value={selectedGenre || ''}
                onChange={(e) => handleGenreChange(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">All Genres</option>
                {genres.map((genre) => (
                  <option key={genre.id} value={genre.id}>
                    {genre.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </div>
            </div>

            {/* Sort dropdown */}
            <div className="relative bg-gray-800 rounded-lg shadow">
              <select
                className="appearance-none w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                value={sortBy}
                onChange={handleSortChange}
              >
                <option value="popularity.desc">Most Popular</option>
                <option value="vote_average.desc">Highest Rated</option>
                <option value="release_date.desc">Newest</option>
                <option value="release_date.asc">Oldest</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-600 text-white px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Movies grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {movies.map((movie) => (
            <Link
              to={`/movie/${movie.id}`}
              key={movie.id}
              className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
            >
              <div className="aspect-[2/3] relative">
                <img
                  src={getImageUrl(movie.poster_path)}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = moviePlaceholder;
                  }}
                />
                <div className="absolute top-0 right-0 bg-black bg-opacity-75 text-yellow-400 p-1 text-xs font-bold">
                  ★ {movie.vote_average.toFixed(1)}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-4">
                  <span className="text-white font-medium">View Details</span>
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm text-white truncate" title={movie.title}>
                  {movie.title}
                </h3>
                <p className="text-xs text-gray-400">
                  {new Date(movie.release_date).getFullYear() || 'Unknown'}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Loading more indicator */}
        {loading && page > 1 && (
          <div className="flex justify-center my-8">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-10 mb-12">
            <nav className="flex space-x-2">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className={`px-4 py-2 rounded-lg ${
                  page === 1
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-800 hover:bg-gray-700 text-white'
                }`}
              >
                Previous
              </button>
              <span className="px-4 py-2 bg-red-600 text-white rounded-lg">
                {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className={`px-4 py-2 rounded-lg ${
                  page === totalPages
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-800 hover:bg-gray-700 text-white'
                }`}
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default Movies;
