import axios from 'axios';
import moviePlaceholder from '../assets/images/movie-placeholder';

// TMDB Configuration - Make sure this API key is valid
const TMDB_API_KEY = '4ebafabfe8923b78541f5edb0f4cf482';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Create axios instance with TMDB API configuration
const tmdbAxios = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: TMDB_API_KEY,
    language: 'en-US'
  },
  timeout: 10000 // Set a 10 second timeout on all requests
});

// Add request interceptor for debugging
tmdbAxios.interceptors.request.use(
  (config) => {
    console.log(`TMDB API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('TMDB API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
tmdbAxios.interceptors.response.use(
  (response) => {
    console.log(`TMDB API Response: ${response.status} from ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('TMDB API Response Error:', error);
    // Log useful information for debugging
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    return Promise.reject(error);
  }
);

// Helper function to get image URL
export const getImageUrl = (path, size = 'w500') => {
  if (!path) return moviePlaceholder;
  if (path.startsWith('http')) return path; // Already a full URL
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

// Movie related API calls
const getPopularMovies = (page = 1) => {
  return tmdbAxios.get('/movie/popular', { params: { page } })
    .then(response => response.data.results || [])
    .catch(error => {
      console.error('Error fetching popular movies:', error);
      return [];
    });
};

const getTrendingMovies = (timeWindow = 'week') => {
  return tmdbAxios.get(`/trending/movie/${timeWindow}`)
    .then(response => response.data.results || [])
    .catch(error => {
      console.error('Error fetching trending movies:', error);
      return [];
    });
};

const getTopRatedMovies = (page = 1) => {
  return tmdbAxios.get('/movie/top_rated', { params: { page } })
    .then(response => response.data.results || [])
    .catch(error => {
      console.error('Error fetching top rated movies:', error);
      return [];
    });
};

const getUpcomingMovies = (page = 1) => {
  return tmdbAxios.get('/movie/upcoming', { params: { page } })
    .then(response => response.data.results || [])
    .catch(error => {
      console.error('Error fetching upcoming movies:', error);
      return [];
    });
};

const getMovieDetails = (movieId) => {
  return tmdbAxios.get(`/movie/${movieId}`, {
    params: {
      append_to_response: 'videos,credits,similar,recommendations'
    }
  })
    .then(response => response.data)
    .catch(error => {
      console.error(`Error fetching movie details for ID ${movieId}:`, error);
      return null;
    });
};

const getSimilarMovies = (movieId, page = 1) => {
  return tmdbAxios.get(`/movie/${movieId}/similar`, { params: { page } })
    .then(response => response.data.results || [])
    .catch(error => {
      console.error(`Error fetching similar movies for ID ${movieId}:`, error);
      return [];
    });
};

// TV Show related API calls
const getPopularTvShows = (page = 1) => {
  return tmdbAxios.get('/tv/popular', { params: { page } })
    .then(response => response.data.results || [])
    .catch(error => {
      console.error('Error fetching popular TV shows:', error);
      return [];
    });
};

const getTrendingTvShows = (timeWindow = 'week') => {
  return tmdbAxios.get(`/trending/tv/${timeWindow}`)
    .then(response => response.data.results || [])
    .catch(error => {
      console.error('Error fetching trending TV shows:', error);
      return [];
    });
};

const getTopRatedTvShows = (page = 1) => {
  return tmdbAxios.get('/tv/top_rated', { params: { page } })
    .then(response => response.data.results || [])
    .catch(error => {
      console.error('Error fetching top rated TV shows:', error);
      return [];
    });
};

const getTvShowDetails = (tvId) => {
  return tmdbAxios.get(`/tv/${tvId}`, {
    params: {
      append_to_response: 'videos,credits,similar,recommendations'
    }
  })
    .then(response => response.data)
    .catch(error => {
      console.error(`Error fetching TV show details for ID ${tvId}:`, error);
      return null;
    });
};

const getTvSeasonDetails = (tvId, seasonNumber) => {
  return tmdbAxios.get(`/tv/${tvId}/season/${seasonNumber}`)
    .then(response => response.data)
    .catch(error => {
      console.error(`Error fetching season ${seasonNumber} details for TV show ID ${tvId}:`, error);
      return null;
    });
};

const getSimilarTvShows = (tvId, page = 1) => {
  return tmdbAxios.get(`/tv/${tvId}/similar`, { params: { page } })
    .then(response => response.data.results || [])
    .catch(error => {
      console.error(`Error fetching similar TV shows for ID ${tvId}:`, error);
      return [];
    });
};

// Search functionality
const searchMulti = (query, page = 1) => {
  if (!query || query.trim() === '') {
    console.warn('Empty search query provided to searchMulti');
    return Promise.resolve({ results: [] });
  }
  
  return tmdbAxios.get('/search/multi', {
    params: {
      query,
      page,
      include_adult: false
    }
  })
    .then(response => response.data)
    .catch(error => {
      console.error(`Error searching for "${query}":`, error);
      return { results: [] };
    });
};

const searchMovies = (query, page = 1) => {
  if (!query || query.trim() === '') {
    console.warn('Empty search query provided to searchMovies');
    return Promise.resolve([]);
  }
  
  return tmdbAxios.get('/search/movie', {
    params: {
      query,
      page,
      include_adult: false
    }
  })
    .then(response => response.data.results || [])
    .catch(error => {
      console.error(`Error searching for movies "${query}":`, error);
      return [];
    });
};

const searchTvShows = (query, page = 1) => {
  if (!query || query.trim() === '') {
    console.warn('Empty search query provided to searchTvShows');
    return Promise.resolve([]);
  }
  
  return tmdbAxios.get('/search/tv', {
    params: {
      query,
      page,
      include_adult: false
    }
  })
    .then(response => response.data.results || [])
    .catch(error => {
      console.error(`Error searching for TV shows "${query}":`, error);
      return [];
    });
};

// Get search suggestions (combined movies and TV shows)
const getSearchSuggestions = async (query) => {
  if (!query || query.trim() === '') {
    return [];
  }
  
  try {
    const [movieResults, tvResults] = await Promise.all([
      searchMovies(query),
      searchTvShows(query)
    ]);
    
    // Format results
    const formattedMovies = movieResults.slice(0, 3).map(movie => ({
      id: movie.id,
      title: movie.title,
      type: 'movie',
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      poster_path: movie.poster_path
    }));
    
    const formattedTvShows = tvResults.slice(0, 3).map(show => ({
      id: show.id,
      title: show.name,
      type: 'tv',
      year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : null,
      poster_path: show.poster_path
    }));
    
    // Combine and limit results
    return [...formattedMovies, ...formattedTvShows].slice(0, 5);
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    return [];
  }
};

// Discover functionality
const discoverMovies = (params = {}) => {
  return tmdbAxios.get('/discover/movie', { params })
    .then(response => response.data)
    .catch(error => {
      console.error('Error discovering movies:', error);
      return { results: [] };
    });
};

const discoverTvShows = (params = {}) => {
  return tmdbAxios.get('/discover/tv', { params })
    .then(response => response.data)
    .catch(error => {
      console.error('Error discovering TV shows:', error);
      return { results: [] };
    });
};

// Get genres
const getMovieGenres = () => {
  return tmdbAxios.get('/genre/movie/list')
    .then(response => response.data.genres || [])
    .catch(error => {
      console.error('Error fetching movie genres:', error);
      return [];
    });
};

const getTvGenres = () => {
  return tmdbAxios.get('/genre/tv/list')
    .then(response => response.data.genres || [])
    .catch(error => {
      console.error('Error fetching TV genres:', error);
      return [];
    });
};

// Test API Key - use this to verify the API key is working
const testApiConnection = () => {
  return tmdbAxios.get('/configuration')
    .then(response => {
      console.log('TMDB API Connection Success:', response.data);
      return {
        success: true,
        data: response.data
      };
    })
    .catch(error => {
      console.error('TMDB API Connection Error:', error);
      return {
        success: false,
        error: error
      };
    });
};

const tmdbApi = {
  getMovieDetails,
  getTvShowDetails,
  getTvSeasonDetails,
  getSimilarMovies,
  testApiConnection,
  // Movies
  getPopularMovies,
  getTrendingMovies,
  getTopRatedMovies,
  getUpcomingMovies,
  // TV Shows
  getPopularTvShows,
  getTrendingTvShows,
  getTopRatedTvShows,
  getSimilarTvShows,
  // Search
  searchMulti,
  searchMovies,
  searchTvShows,
  getSearchSuggestions,
  // Discover
  discoverMovies,
  discoverTvShows,
  // Genres
  getMovieGenres,
  getTvGenres,
  // Utils
  getImageUrl
};

export default tmdbApi;