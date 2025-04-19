from flask import Blueprint, request, jsonify
from app.utils.database import Database
from app.utils.auth import token_required
from app.utils.tmdb import TMDBApi
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
favorites_bp = Blueprint('favorites', __name__)

@favorites_bp.route('', methods=['GET'])
@token_required
def get_favorites():
    """Get all favorites for the current user"""
    user_id = request.user['user_id']
    
    try:
        # Get favorites from database
        favorites = Database.execute_query(
            """
            SELECT favorite_id, content_id, added_at
            FROM favorites
            WHERE user_id = %s
            ORDER BY added_at DESC
            """,
            (user_id,)
        )
        
        # Separate movie and TV show IDs
        movie_ids = []
        tv_ids = []
        
        for favorite in favorites:
            content_id = favorite['content_id']
            if content_id.startswith('tv_'):
                # TV show
                tv_ids.append(int(content_id.replace('tv_', '')))
            else:
                # Movie
                movie_ids.append(int(content_id))
        
        # Get details for movies
        movies = []
        if movie_ids:
            # Fetch details in batches to avoid making too many API calls
            for movie_id in movie_ids:
                movie_details = TMDBApi.get_movie_details(movie_id)
                if 'error' not in movie_details:
                    movie_details['media_type'] = 'movie'
                    movies.append(movie_details)
        
        # Get details for TV shows
        tv_shows = []
        if tv_ids:
            # Fetch details in batches to avoid making too many API calls
            for tv_id in tv_ids:
                tv_details = TMDBApi.get_tv_show_details(tv_id)
                if 'error' not in tv_details:
                    tv_details['media_type'] = 'tv'
                    tv_shows.append(tv_details)
        
        # Combine and sort by added_at date
        combined_favorites = {
            'movies': movies,
            'tv_shows': tv_shows,
            'total': len(movies) + len(tv_shows)
        }
        
        return jsonify(combined_favorites), 200
        
    except Exception as e:
        logger.error(f"Error getting favorites: {e}")
        return jsonify({'message': 'Error getting favorites'}), 500

@favorites_bp.route('', methods=['POST'])
@token_required
def add_to_favorites():
    """Add content to favorites"""
    data = request.get_json()
    user_id = request.user['user_id']
    
    # Check if required fields are provided
    if 'content_id' not in data or 'content_type' not in data:
        return jsonify({'message': 'Missing content_id or content_type'}), 400
    
    content_id = data['content_id']
    content_type = data['content_type']
    
    # Format content_id based on content_type
    if content_type == 'tv':
        db_content_id = f"tv_{content_id}"
    else:
        db_content_id = str(content_id)
    
    try:
        # Check if already in favorites
        existing = Database.get_single_result(
            """
            SELECT favorite_id
            FROM favorites
            WHERE user_id = %s AND content_id = %s
            """,
            (user_id, db_content_id)
        )
        
        if existing:
            return jsonify({'message': 'Content already in favorites'}), 409
        
        # Add to favorites
        favorite_id = Database.execute_query(
            """
            INSERT INTO favorites (user_id, content_id, added_at)
            VALUES (%s, %s, NOW())
            """,
            (user_id, db_content_id),
            fetch=False
        )
        
        return jsonify({
            'message': 'Added to favorites',
            'favorite_id': favorite_id
        }), 201
        
    except Exception as e:
        logger.error(f"Error adding to favorites: {e}")
        return jsonify({'message': 'Error adding to favorites'}), 500

@favorites_bp.route('/<string:content_id>', methods=['DELETE'])
@token_required
def remove_from_favorites(content_id):
    """Remove content from favorites"""
    user_id = request.user['user_id']
    
    try:
        # Check if content exists in favorites
        existing = Database.get_single_result(
            """
            SELECT favorite_id
            FROM favorites
            WHERE user_id = %s AND content_id = %s
            """,
            (user_id, content_id)
        )
        
        if not existing:
            return jsonify({'message': 'Content not found in favorites'}), 404
        
        # Remove from favorites
        Database.execute_query(
            """
            DELETE FROM favorites
            WHERE favorite_id = %s
            """,
            (existing['favorite_id'],),
            fetch=False
        )
        
        return jsonify({'message': 'Removed from favorites'}), 200
        
    except Exception as e:
        logger.error(f"Error removing from favorites: {e}")
        return jsonify({'message': 'Error removing from favorites'}), 500

@favorites_bp.route('/check/<string:content_type>/<int:content_id>', methods=['GET'])
@token_required
def check_favorite(content_type, content_id):
    """Check if content is in favorites"""
    user_id = request.user['user_id']
    
    # Format content_id based on content_type
    if content_type == 'tv':
        db_content_id = f"tv_{content_id}"
    else:
        db_content_id = str(content_id)
    
    try:
        # Check if content is in favorites
        existing = Database.get_single_result(
            """
            SELECT favorite_id
            FROM favorites
            WHERE user_id = %s AND content_id = %s
            """,
            (user_id, db_content_id)
        )
        
        return jsonify({
            'is_favorite': existing is not None,
            'favorite_id': existing['favorite_id'] if existing else None
        }), 200
        
    except Exception as e:
        logger.error(f"Error checking favorite status: {e}")
        return jsonify({'message': 'Error checking favorite status'}), 500 