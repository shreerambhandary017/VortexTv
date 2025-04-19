import requests
from flask import current_app
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TMDBApi:
    """
    TMDB API utility class for interacting with The Movie Database API
    """
    
    @staticmethod
    def get_base_url():
        """Returns the TMDB API base URL"""
        return current_app.config.get('TMDB_API_BASE_URL')
    
    @staticmethod
    def get_api_key():
        """Returns the TMDB API key"""
        return current_app.config.get('TMDB_API_KEY')
    
    @staticmethod
    def get_image_base_url():
        """Returns the TMDB image base URL"""
        return current_app.config.get('TMDB_IMAGE_BASE_URL')
    
    @staticmethod
    def get_image_url(path, size='original'):
        """
        Get full image URL from image path
        
        Args:
            path (str): The image path from TMDB
            size (str): Image size (w500, original, etc.)
            
        Returns:
            str: Full image URL
        """
        if not path:
            return None
            
        return f"{TMDBApi.get_image_base_url()}/{size}{path}"
    
    @staticmethod
    def make_request(endpoint, params=None):
        """
        Make a request to the TMDB API
        
        Args:
            endpoint (str): API endpoint (e.g., /movie/popular)
            params (dict, optional): Additional query parameters
            
        Returns:
            dict: API response as JSON
        """
        url = f"{TMDBApi.get_base_url()}{endpoint}"
        
        # Initialize params if None
        if params is None:
            params = {}
            
        # Add API key to params
        params['api_key'] = TMDBApi.get_api_key()
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"TMDB API request error: {e}")
            return {'error': str(e)}
    
    # Movie related methods
    @staticmethod
    def get_popular_movies(page=1):
        """Get popular movies"""
        return TMDBApi.make_request('/movie/popular', {'page': page})
    
    @staticmethod
    def get_trending_movies(time_window='week'):
        """Get trending movies (day or week)"""
        return TMDBApi.make_request(f'/trending/movie/{time_window}')
    
    @staticmethod
    def get_top_rated_movies(page=1):
        """Get top rated movies"""
        return TMDBApi.make_request('/movie/top_rated', {'page': page})
    
    @staticmethod
    def get_upcoming_movies(page=1):
        """Get upcoming movies"""
        return TMDBApi.make_request('/movie/upcoming', {'page': page})
    
    @staticmethod
    def get_movie_details(movie_id):
        """
        Get detailed information about a movie
        
        Args:
            movie_id (int): TMDB movie ID
            
        Returns:
            dict: Movie details
        """
        return TMDBApi.make_request(
            f'/movie/{movie_id}',
            {'append_to_response': 'videos,credits,similar,recommendations'}
        )
    
    # TV Show related methods
    @staticmethod
    def get_popular_tv_shows(page=1):
        """Get popular TV shows"""
        return TMDBApi.make_request('/tv/popular', {'page': page})
    
    @staticmethod
    def get_trending_tv_shows(time_window='week'):
        """Get trending TV shows (day or week)"""
        return TMDBApi.make_request(f'/trending/tv/{time_window}')
    
    @staticmethod
    def get_top_rated_tv_shows(page=1):
        """Get top rated TV shows"""
        return TMDBApi.make_request('/tv/top_rated', {'page': page})
    
    @staticmethod
    def get_tv_show_details(tv_id):
        """
        Get detailed information about a TV show
        
        Args:
            tv_id (int): TMDB TV show ID
            
        Returns:
            dict: TV show details
        """
        return TMDBApi.make_request(
            f'/tv/{tv_id}',
            {'append_to_response': 'videos,credits,similar,recommendations'}
        )
    
    # Search functionality
    @staticmethod
    def search_multi(query, page=1):
        """
        Search for movies, TV shows, and people
        
        Args:
            query (str): Search query
            page (int): Page number
            
        Returns:
            dict: Search results
        """
        return TMDBApi.make_request(
            '/search/multi',
            {'query': query, 'page': page, 'include_adult': 'false'}
        )
    
    @staticmethod
    def search_movies(query, page=1):
        """Search for movies"""
        return TMDBApi.make_request(
            '/search/movie',
            {'query': query, 'page': page, 'include_adult': 'false'}
        )
    
    @staticmethod
    def search_tv_shows(query, page=1):
        """Search for TV shows"""
        return TMDBApi.make_request(
            '/search/tv',
            {'query': query, 'page': page, 'include_adult': 'false'}
        )
    
    # Discover functionality
    @staticmethod
    def discover_movies(params=None):
        """
        Discover movies by different filters
        
        Args:
            params (dict): Filter parameters
            
        Returns:
            dict: Movies matching the filters
        """
        return TMDBApi.make_request('/discover/movie', params)
    
    @staticmethod
    def discover_tv_shows(params=None):
        """Discover TV shows by different filters"""
        return TMDBApi.make_request('/discover/tv', params)
    
    # Get genres
    @staticmethod
    def get_movie_genres():
        """Get list of movie genres"""
        return TMDBApi.make_request('/genre/movie/list')
    
    @staticmethod
    def get_tv_genres():
        """Get list of TV show genres"""
        return TMDBApi.make_request('/genre/tv/list') 