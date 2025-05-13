import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import tmdbApi, { getImageUrl } from '../api/tmdbApi';
import moviePlaceholder from '../assets/images/movie-placeholder';

const Browse = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [content, setContent] = useState({
    featuredMovie: null,
    trendingMovies: [],
    popularTVShows: [],
    newReleases: []
  });
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(true);

  // Parse search query from URL
  const searchParams = new URLSearchParams(location.search);
  const searchQuery = searchParams.get('search');

  // Fallback content to use when API is unavailable
  const fallbackContent = {
    featuredMovie: {
      id: 1,
      title: 'The Matrix',
      backdrop_path: 'https://m.media-amazon.com/images/M/MV5BNzQzOTk3OTAtNDQ0Zi00ZTVkLWI0MTEtMDllZjNkYzNjNTc4L2ltYWdlXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_.jpg',
      vote_average: 8.7,
      release_date: '1999-03-31',
      overview: 'A computer programmer discovers that reality as he knows it is a simulation created by machines, and joins a rebellion to break free.'
    },
    trendingMovies: [
      { id: 2, title: 'Inception', poster_path: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_.jpg', vote_average: 8.8, release_date: '2010-07-16' },
      { id: 3, title: 'The Dark Knight', poster_path: 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg', vote_average: 9.0, release_date: '2008-07-18' },
      { id: 4, title: 'Pulp Fiction', poster_path: 'https://m.media-amazon.com/images/M/MV5BNGNhMDIzZTUtNTBlZi00MTRlLWFjM2ItYzViMjE3YzI5MjljXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_.jpg', vote_average: 8.9, release_date: '1994-09-10' },
      { id: 5, title: 'Forrest Gump', poster_path: 'https://m.media-amazon.com/images/M/MV5BNWIwODRlZTUtY2U3ZS00Yzg1LWJhNzYtMmZiYmEyNmU1NjMzXkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_.jpg', vote_average: 8.8, release_date: '1994-06-23' },
      { id: 6, title: 'The Godfather', poster_path: 'https://m.media-amazon.com/images/M/MV5BM2MyNjYxNmUtYTAwNi00MTYxLWJmNWYtYzZlODY3ZTk3OTFlXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_.jpg', vote_average: 9.2, release_date: '1972-03-14' },
      { id: 7, title: 'Fight Club', poster_path: 'https://m.media-amazon.com/images/M/MV5BMmEzNTkxYjQtZTc0MC00YTVjLTg5ZTEtZWMwOWVlYzY0NWIwXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_.jpg', vote_average: 8.8, release_date: '1999-10-15' },
      { id: 8, title: 'The Lord of the Rings', poster_path: 'https://m.media-amazon.com/images/M/MV5BN2EyZjM3NzUtNWUzMi00MTgxLWI0NTctMzY4M2VlOTdjZWRiXkEyXkFqcGdeQXVyNDUzOTQ5MjY@._V1_.jpg', vote_average: 8.8, release_date: '2001-12-19' }
    ],
    popularTVShows: [
      { id: 9, name: 'Breaking Bad', poster_path: 'https://m.media-amazon.com/images/M/MV5BYmQ4YWMxYjUtNjZmYi00MDQ1LWFjMjMtNjA5ZDdiYjdiODU5XkEyXkFqcGdeQXVyMTMzNDExODE5._V1_.jpg', vote_average: 9.5, first_air_date: '2008-01-20' },
      { id: 10, name: 'Stranger Things', poster_path: 'https://m.media-amazon.com/images/M/MV5BMDZkYmVhNjMtNWU4MC00MDQxLWE3MjYtZGMzZWI1ZjhlOWJmXkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_.jpg', vote_average: 8.7, first_air_date: '2016-07-15' },
      { id: 11, name: 'Game of Thrones', poster_path: 'https://m.media-amazon.com/images/M/MV5BYTRiNDQwYzAtMzVlZS00NTI5LWJjYjUtMzkwNTUzMWMxZTllXkEyXkFqcGdeQXVyNDIzMzcwNjc@._V1_.jpg', vote_average: 9.3, first_air_date: '2011-04-17' },
      { id: 12, name: 'The Mandalorian', poster_path: 'https://m.media-amazon.com/images/M/MV5BZjRlZDIyNDMtYzU1Ny00YzExLTkyNzQtN2M3MzI3NGNiMTQzXkEyXkFqcGdeQXVyMDM2NDM2MQ@@._V1_.jpg', vote_average: 8.7, first_air_date: '2019-11-12' },
      { id: 13, name: 'The Witcher', poster_path: 'https://m.media-amazon.com/images/M/MV5BN2FiOWU4YzYtMzZiOS00MzcyLTlkOGEtOTgwZmEwMzAxMzA3XkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_.jpg', vote_average: 8.2, first_air_date: '2019-12-20' },
      { id: 14, name: 'The Boys', poster_path: 'https://m.media-amazon.com/images/M/MV5BZjY5ZWI4ZDgtZGY5NS00NWUwLWIyMDgtZGY5Y2NlMmIwMTM5XkEyXkFqcGdeQXVyMTEyMjM2NDc2._V1_.jpg', vote_average: 8.7, first_air_date: '2019-07-26' },
      { id: 15, name: 'The Crown', poster_path: 'https://m.media-amazon.com/images/M/MV5BZmY0MzBlNjctNTRmNy00Njk3LWJjMzEtMDQ0YzE4NzJkODNlXkEyXkFqcGdeQXVyMTEyMjM2NDc2._V1_.jpg', vote_average: 8.3, first_air_date: '2016-11-04' },
      { id: 16, name: 'Black Mirror', poster_path: 'https://m.media-amazon.com/images/M/MV5BNTMwYjQ5MGctOWZjNy00YzUwLTg0MzgtM2MzODk3YzYyZDMzXkEyXkFqcGdeQXVyMTMzNDExODE5._V1_.jpg', vote_average: 8.8, first_air_date: '2011-12-04' }
    ],
    newReleases: [
      { id: 17, title: 'Dune: Part Two', poster_path: 'https://m.media-amazon.com/images/M/MV5BODI4ZTljYTMtODQxYy00MmFhLWEwMmUtZjU5Y2U5NmQ4ZjJkXkEyXkFqcGdeQXVyMTUzMTg2ODkz._V1_.jpg', release_date: '2024-03-01' },
      { id: 18, title: 'Deadpool & Wolverine', poster_path: 'https://m.media-amazon.com/images/M/MV5BMDZkYmVhNjMtNWU4MC00MDQxLWE3MjYtZGMzZWI1ZjhlOWJmXkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_.jpg', release_date: '2024-07-26' },
      { id: 19, title: 'Furiosa: A Mad Max Saga', poster_path: 'https://m.media-amazon.com/images/M/MV5BZjRlZDIyNDMtYzU1Ny00YzExLTkyNzQtN2M3MzI3NGNiMTQzXkEyXkFqcGdeQXVyMDM2NDM2MQ@@._V1_.jpg', release_date: '2024-05-24' },
      { id: 20, title: 'Inside Out 2', poster_path: 'https://m.media-amazon.com/images/M/MV5BN2FiOWU4YzYtMzZiOS00MzcyLTlkOGEtOTgwZmEwMzAxMzA3XkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_.jpg', release_date: '2024-06-14' },
      { id: 21, title: 'Godzilla x Kong: The New Empire', poster_path: 'https://m.media-amazon.com/images/M/MV5BYmQ4YWMxYjUtNjZmYi00MDQ1LWFjMjMtNjA5ZDdiYjdiODU5XkEyXkFqcGdeQXVyMTMzNDExODE5._V1_.jpg', release_date: '2024-04-12' },
      { id: 22, title: 'Mission: Impossible - Dead Reckoning Part Two', poster_path: 'https://m.media-amazon.com/images/M/MV5BMDZkYmVhNjMtNWU4MC00MDQxLWE3MjYtZGMzZWI1ZjhlOWJmXkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_.jpg', release_date: '2024-06-28' },
      { id: 23, title: 'Kung Fu Panda 4', poster_path: 'https://m.media-amazon.com/images/M/MV5BZjRlZDIyNDMtYzU1Ny00YzExLTkyNzQtN2M3MzI3NGNiMTQzXkEyXkFqcGdeQXVyMDM2NDM2MQ@@._V1_.jpg', release_date: '2024-03-08' },
      { id: 24, title: 'The Fall Guy', poster_path: 'https://m.media-amazon.com/images/M/MV5BN2FiOWU4YzYtMzZiOS00MzcyLTlkOGEtOTgwZmEwMzAxMzA3XkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_.jpg', release_date: '2024-05-03' }
    ]
  };

  useEffect(() => {
    // Clear search results when navigating to browse page without search
    if (!searchQuery) {
      setSearchResults([]);
      setSearching(false);
    }
    
    // Test API connection first to verify credentials
    tmdbApi.testApiConnection()
      .then(result => {
        if (!result.success) {
          throw new Error("TMDB API connection failed");
        }
        
        // If there's a search query, search for movies/shows
        if (searchQuery) {
          searchContent(searchQuery);
        } else {
          // Otherwise fetch regular content
          fetchContent();
        }
      })
      .catch(err => {
        console.error("API Connection Error:", err);
        setError("There was a problem connecting to the movie database. Showing sample content instead.");
        setUsingFallback(true);
        setContent(fallbackContent);
        setLoading(false);
      });
  }, [searchQuery]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      setUsingFallback(false);
      
      // Set a timeout for the API request
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API request timed out')), 10000)
      );
      
      // Fetch data in parallel for better performance
      const fetchDataPromise = Promise.all([
        tmdbApi.getTrendingMovies(),
        tmdbApi.getPopularTvShows(),
        tmdbApi.getUpcomingMovies()
      ]);
      
      // Race between the API request and the timeout
      const [trendingMovies, popularTVShows, upcomingMovies] = await Promise.race([
        fetchDataPromise,
        timeoutPromise.then(() => { throw new Error('Timeout'); })
      ]);
      
      // Verify we have data
      if (!trendingMovies?.length && !popularTVShows?.length && !upcomingMovies?.length) {
        throw new Error('No content received from API');
      }
      
      // Set featured movie from first trending movie or first upcoming if trending is empty
      const featuredMovie = trendingMovies.length > 0 
        ? trendingMovies[0] 
        : (upcomingMovies.length > 0 ? upcomingMovies[0] : null);
      
      setContent({
        featuredMovie,
        trendingMovies: trendingMovies.slice(1, 9), // Skip the featured one
        popularTVShows: popularTVShows.slice(0, 8),
        newReleases: upcomingMovies.slice(0, 8)
      });
      
      setError(null);
    } catch (err) {
      console.error('Error fetching content:', err);
      setError('Unable to connect to the movie database. Showing sample content instead.');
      setUsingFallback(true);
      setContent(fallbackContent);
    } finally {
      setLoading(false);
    }
  };

  const searchContent = async (query) => {
    try {
      setLoading(true);
      setSearching(true);
      
      // Search for movies and TV shows
      const [movieResults, tvResults] = await Promise.all([
        tmdbApi.searchMovies(query),
        tmdbApi.searchTvShows(query)
      ]);
      
      // Combine results and sort by popularity
      const combinedResults = [
        ...movieResults.map(movie => ({ ...movie, mediaType: 'movie' })),
        ...tvResults.map(show => ({ ...show, mediaType: 'tv', title: show.name }))
      ].sort((a, b) => b.popularity - a.popularity);
      
      setSearchResults(combinedResults);
      setError(null);
    } catch (err) {
      console.error('Error searching content:', err);
      setError(`Unable to search for "${query}". Please try again later.`);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to retry loading if initial attempt failed
  const handleRetry = () => {
    setError(null);
    if (searchQuery) {
      searchContent(searchQuery);
    } else {
      fetchContent();
    }
  };

  // Function to clear search and return to browse
  const clearSearch = () => {
    navigate('/browse');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="text-xl text-white p-8 rounded-lg">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p>{searching ? `Searching for "${searchQuery}"...` : 'Loading the best movies and shows for you...'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {error && (
        <div className="container mx-auto px-4 py-12">
          <div className="bg-red-900 border border-red-600 text-white px-6 py-4 rounded-lg mb-8">
            <p className="mb-4">{error}</p>
            {!usingFallback && (
              <button 
                onClick={handleRetry}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Search Results */}
      {searchQuery && (
        <div className="container mx-auto px-4 py-8 mt-14">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">
              Search Results for "{searchQuery}"
            </h1>
            <button
              onClick={clearSearch}
              className="text-gray-400 hover:text-white flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Clear Search
            </button>
          </div>
          
          {searchResults.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-2xl text-gray-400 mb-4">No results found for "{searchQuery}"</p>
              <p className="text-gray-500 mb-6">Try different keywords or check your spelling</p>
              <button
                onClick={clearSearch}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
              >
                Browse All Content
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {searchResults.map((item) => (
                <Link to={`/${item.mediaType === 'movie' ? 'movie' : 'tv'}/${item.id}`} key={`${item.mediaType}-${item.id}`} className="group">
                  <div className="relative overflow-hidden rounded-lg mb-2 aspect-[2/3] bg-gray-800">
                    <img
                      src={getImageUrl(item.poster_path, 'w500')}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        if (!e.target.src.includes('placeholder')) {
                          e.target.src = getImageUrl(item.poster_path, 'w342');
                          return;
                        }
                        e.target.src = moviePlaceholder;
                      }}
                    />
                    {item.vote_average > 0 && (
                      <div className="absolute top-0 right-0 bg-black bg-opacity-75 text-yellow-400 p-1 text-sm rounded-bl">
                        ★ {item.vote_average?.toFixed(1)}
                      </div>
                    )}
                    <div className="absolute top-0 left-0 bg-black bg-opacity-75 text-white p-1 text-xs rounded-br uppercase">
                      {item.mediaType}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <span className="text-white font-medium">View Details</span>
                    </div>
                  </div>
                  <h3 className="font-medium truncate text-gray-300 group-hover:text-white transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {item.release_date && new Date(item.release_date).getFullYear()}
                    {item.first_air_date && new Date(item.first_air_date).getFullYear()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Regular Browse Content - Only show if not searching */}
      {!searchQuery && (
        <>
          {/* Featured Movie Banner */}
          {content.featuredMovie && (
            <div className="relative">
              <div 
                className="aspect-[21/9] bg-cover bg-center"
                style={{ 
                  backgroundImage: `url(${usingFallback ? content.featuredMovie.backdrop_path : getImageUrl(content.featuredMovie.backdrop_path, 'original')})` 
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full md:w-2/3 text-white">
                  <h1 className="text-3xl md:text-5xl font-bold mb-2">
                    {content.featuredMovie.title || content.featuredMovie.name}
                  </h1>
                  <div className="flex items-center mb-4">
                    <span className="text-yellow-400 mr-2">★ {content.featuredMovie.vote_average?.toFixed(1)}</span>
                    <span>
                      {new Date(content.featuredMovie.release_date || content.featuredMovie.first_air_date || '').getFullYear() || 'Coming Soon'}
                    </span>
                  </div>
                  <p className="hidden md:block mb-6 text-gray-300 text-lg">
                    {content.featuredMovie.overview || 'No overview available'}
                  </p>
                  <Link
                    to={`/movie/${content.featuredMovie.id}`}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md font-medium transition-colors inline-block"
                  >
                    Watch Now
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="container mx-auto px-4 py-12">
            {/* Trending Movies Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-white">Trending Movies</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                {content.trendingMovies.map((movie) => (
                  <Link to={`/movie/${movie.id}`} key={movie.id} className="group">
                    <div className="relative overflow-hidden rounded-lg mb-2 aspect-[2/3] bg-gray-800">
                      <img
                        src={usingFallback ? movie.poster_path : getImageUrl(movie.poster_path, 'w500')}
                        alt={movie.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          // Try another size if w500 fails
                          if (!usingFallback && !e.target.src.includes('placeholder')) {
                            e.target.src = getImageUrl(movie.poster_path, 'w342');
                            return;
                          }
                          e.target.src = moviePlaceholder;
                        }}
                      />
                      <div className="absolute top-0 right-0 bg-black bg-opacity-75 text-yellow-400 p-1 text-sm rounded-bl">
                        ★ {movie.vote_average?.toFixed(1)}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <span className="text-white font-medium">View Details</span>
                      </div>
                    </div>
                    <h3 className="font-medium truncate text-gray-300 group-hover:text-white transition-colors">
                      {movie.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </section>

            {/* Popular TV Shows Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-white">Popular TV Shows</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                {content.popularTVShows.map((show) => (
                  <Link to={`/tv/${show.id}`} key={show.id} className="group">
                    <div className="relative overflow-hidden rounded-lg mb-2 aspect-[2/3] bg-gray-800">
                      <img
                        src={usingFallback ? show.poster_path : getImageUrl(show.poster_path, 'w500')}
                        alt={show.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          // Try another size if w500 fails
                          if (!usingFallback && !e.target.src.includes('placeholder')) {
                            e.target.src = getImageUrl(show.poster_path, 'w342');
                            return;
                          }
                          e.target.src = moviePlaceholder;
                        }}
                      />
                      <div className="absolute top-0 right-0 bg-black bg-opacity-75 text-yellow-400 p-1 text-sm rounded-bl">
                        ★ {show.vote_average?.toFixed(1)}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <span className="text-white font-medium">View Details</span>
                      </div>
                    </div>
                    <h3 className="font-medium truncate text-gray-300 group-hover:text-white transition-colors">
                      {show.name}
                    </h3>
                  </Link>
                ))}
              </div>
            </section>

            {/* New Releases Section */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-white">Coming Soon</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                {content.newReleases.map((movie) => (
                  <Link to={`/movie/${movie.id}`} key={movie.id} className="group">
                    <div className="relative overflow-hidden rounded-lg mb-2 aspect-[2/3] bg-gray-800">
                      <img
                        src={usingFallback ? movie.poster_path : getImageUrl(movie.poster_path, 'w500')}
                        alt={movie.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          // Try another size if w500 fails
                          if (!usingFallback && !e.target.src.includes('placeholder')) {
                            e.target.src = getImageUrl(movie.poster_path, 'w342');
                            return;
                          }
                          e.target.src = moviePlaceholder;
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                        <span className="text-white text-sm">
                          {movie.release_date ? 
                            new Date(movie.release_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 
                            'Coming Soon'
                          }
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <span className="text-white font-medium">View Details</span>
                      </div>
                    </div>
                    <h3 className="font-medium truncate text-gray-300 group-hover:text-white transition-colors">
                      {movie.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default Browse; 