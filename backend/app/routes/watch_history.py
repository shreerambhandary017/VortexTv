from flask import Blueprint, request, jsonify
from app.utils.database import Database
from app.utils.auth import token_required
from app.utils.tmdb import TMDBApi
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
watch_history_bp = Blueprint('watch_history', __name__)

@watch_history_bp.route('', methods=['GET'])
@token_required
def get_watch_history():
    """Get the current user's watch history"""
    user_id = request.user['user_id']
    
    try:
        # Get watch history from database
        history = Database.execute_query(
            """
            SELECT history_id, content_id, watched_at, watch_duration, watch_percentage
            FROM watch_history
            WHERE user_id = %s
            ORDER BY watched_at DESC
            """,
            (user_id,)
        )
        
        # Separate movie and TV show IDs
        movie_ids = []
        tv_ids = []
        
        for item in history:
            content_id = item['content_id']
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
                    
                    # Find corresponding history item
                    for item in history:
                        if item['content_id'] == str(movie_id):
                            movie_details['watched_at'] = item['watched_at']
                            movie_details['watch_duration'] = item['watch_duration']
                            movie_details['watch_percentage'] = item['watch_percentage']
                            break
                    
                    movies.append(movie_details)
        
        # Get details for TV shows
        tv_shows = []
        if tv_ids:
            # Fetch details in batches to avoid making too many API calls
            for tv_id in tv_ids:
                tv_details = TMDBApi.get_tv_show_details(tv_id)
                if 'error' not in tv_details:
                    tv_details['media_type'] = 'tv'
                    
                    # Find corresponding history item
                    for item in history:
                        if item['content_id'] == f"tv_{tv_id}":
                            tv_details['watched_at'] = item['watched_at']
                            tv_details['watch_duration'] = item['watch_duration']
                            tv_details['watch_percentage'] = item['watch_percentage']
                            break
                    
                    tv_shows.append(tv_details)
        
        # Combine
        combined_history = {
            'movies': movies,
            'tv_shows': tv_shows,
            'total': len(movies) + len(tv_shows)
        }
        
        return jsonify(combined_history), 200
        
    except Exception as e:
        logger.error(f"Error getting watch history: {e}")
        return jsonify({'message': 'Error getting watch history'}), 500

@watch_history_bp.route('', methods=['POST'])
@token_required
def add_to_watch_history():
    """Add or update an item in watch history"""
    data = request.get_json()
    user_id = request.user['user_id']
    
    # Check required fields
    if 'content_id' not in data:
        return jsonify({'message': 'Missing content_id'}), 400
    
    content_id = data['content_id']
    watch_duration = data.get('watch_duration', 0)
    watch_percentage = data.get('watch_percentage', 0)
    
    try:
        # Check if item already exists in watch history
        existing = Database.get_single_result(
            """
            SELECT history_id
            FROM watch_history
            WHERE user_id = %s AND content_id = %s
            """,
            (user_id, content_id)
        )
        
        if existing:
            # Update existing entry
            Database.execute_query(
                """
                UPDATE watch_history
                SET watched_at = NOW(), watch_duration = %s, watch_percentage = %s
                WHERE history_id = %s
                """,
                (watch_duration, watch_percentage, existing['history_id']),
                fetch=False
            )
            
            message = 'Watch history updated'
        else:
            # Insert new entry
            Database.execute_query(
                """
                INSERT INTO watch_history (user_id, content_id, watched_at, watch_duration, watch_percentage)
                VALUES (%s, %s, NOW(), %s, %s)
                """,
                (user_id, content_id, watch_duration, watch_percentage),
                fetch=False
            )
            
            message = 'Added to watch history'
        
        return jsonify({'message': message}), 200
        
    except Exception as e:
        logger.error(f"Error updating watch history: {e}")
        return jsonify({'message': 'Error updating watch history'}), 500

@watch_history_bp.route('/<int:history_id>', methods=['DELETE'])
@token_required
def remove_from_watch_history(history_id):
    """Remove an item from watch history"""
    user_id = request.user['user_id']
    
    try:
        # Check if item exists and belongs to the user
        existing = Database.get_single_result(
            """
            SELECT history_id
            FROM watch_history
            WHERE history_id = %s AND user_id = %s
            """,
            (history_id, user_id)
        )
        
        if not existing:
            return jsonify({'message': 'History item not found or unauthorized'}), 404
        
        # Delete the item
        Database.execute_query(
            """
            DELETE FROM watch_history
            WHERE history_id = %s
            """,
            (history_id,),
            fetch=False
        )
        
        return jsonify({'message': 'Removed from watch history'}), 200
        
    except Exception as e:
        logger.error(f"Error removing from watch history: {e}")
        return jsonify({'message': 'Error removing from watch history'}), 500

@watch_history_bp.route('/clear', methods=['DELETE'])
@token_required
def clear_watch_history():
    """Clear the entire watch history for the current user"""
    user_id = request.user['user_id']
    
    try:
        # Delete all history items for the user
        Database.execute_query(
            """
            DELETE FROM watch_history
            WHERE user_id = %s
            """,
            (user_id,),
            fetch=False
        )
        
        return jsonify({'message': 'Watch history cleared'}), 200
        
    except Exception as e:
        logger.error(f"Error clearing watch history: {e}")
        return jsonify({'message': 'Error clearing watch history'}), 500 