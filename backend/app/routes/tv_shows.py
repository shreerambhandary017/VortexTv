from flask import Blueprint, request, jsonify
from app.utils.database import Database
from app.utils.auth import token_required, has_subscription
from app.utils.tmdb import TMDBApi
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
tv_shows_bp = Blueprint('tv_shows', __name__)

@tv_shows_bp.route('/popular', methods=['GET'])
@token_required
def get_popular_tv_shows():
    """Get popular TV shows"""
    try:
        page = request.args.get('page', 1, type=int)
        response = TMDBApi.get_popular_tv_shows(page)
        
        if 'error' in response:
            return jsonify({'message': response['error']}), 500
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error getting popular TV shows: {e}")
        return jsonify({'message': 'Error getting popular TV shows'}), 500

@tv_shows_bp.route('/trending', methods=['GET'])
@token_required
def get_trending_tv_shows():
    """Get trending TV shows"""
    try:
        time_window = request.args.get('time_window', 'week')
        if time_window not in ['day', 'week']:
            time_window = 'week'
        
        response = TMDBApi.get_trending_tv_shows(time_window)
        
        if 'error' in response:
            return jsonify({'message': response['error']}), 500
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error getting trending TV shows: {e}")
        return jsonify({'message': 'Error getting trending TV shows'}), 500

@tv_shows_bp.route('/top-rated', methods=['GET'])
@token_required
def get_top_rated_tv_shows():
    """Get top rated TV shows"""
    try:
        page = request.args.get('page', 1, type=int)
        response = TMDBApi.get_top_rated_tv_shows(page)
        
        if 'error' in response:
            return jsonify({'message': response['error']}), 500
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error getting top rated TV shows: {e}")
        return jsonify({'message': 'Error getting top rated TV shows'}), 500

@tv_shows_bp.route('/<int:tv_id>', methods=['GET'])
@token_required
@has_subscription
def get_tv_show_details(tv_id):
    """Get TV show details"""
    try:
        response = TMDBApi.get_tv_show_details(tv_id)
        
        if 'error' in response:
            return jsonify({'message': response['error']}), 500
        
        # Track this view in user's watch history
        user_id = request.user['user_id']
        
        # Check if TV show is already in watch history
        existing_entry = Database.get_single_result(
            """
            SELECT history_id
            FROM watch_history
            WHERE user_id = %s AND content_id = %s
            """,
            (user_id, f"tv_{tv_id}")
        )
        
        if existing_entry:
            # Update existing entry
            Database.execute_query(
                """
                UPDATE watch_history
                SET watched_at = NOW()
                WHERE history_id = %s
                """,
                (existing_entry['history_id'],),
                fetch=False
            )
        else:
            # Insert new entry
            Database.execute_query(
                """
                INSERT INTO watch_history (user_id, content_id, watched_at)
                VALUES (%s, %s, NOW())
                """,
                (user_id, f"tv_{tv_id}"),
                fetch=False
            )
        
        # Check if TV show is in user's favorites
        is_favorite = Database.get_single_result(
            """
            SELECT favorite_id
            FROM favorites
            WHERE user_id = %s AND content_id = %s
            """,
            (user_id, f"tv_{tv_id}")
        )
        
        response['is_favorite'] = is_favorite is not None
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error getting TV show details: {e}")
        return jsonify({'message': 'Error getting TV show details'}), 500

@tv_shows_bp.route('/genres', methods=['GET'])
@token_required
def get_tv_genres():
    """Get TV show genres"""
    try:
        response = TMDBApi.get_tv_genres()
        
        if 'error' in response:
            return jsonify({'message': response['error']}), 500
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error getting TV genres: {e}")
        return jsonify({'message': 'Error getting TV genres'}), 500

@tv_shows_bp.route('/discover', methods=['GET'])
@token_required
def discover_tv_shows():
    """Discover TV shows based on filters"""
    try:
        # Get query parameters
        params = {}
        
        # Pagination
        params['page'] = request.args.get('page', 1, type=int)
        
        # Sorting
        sort_by = request.args.get('sort_by')
        if sort_by:
            params['sort_by'] = sort_by
        
        # Filtering
        with_genres = request.args.get('with_genres')
        if with_genres:
            params['with_genres'] = with_genres
        
        first_air_date_year = request.args.get('first_air_date_year', type=int)
        if first_air_date_year:
            params['first_air_date_year'] = first_air_date_year
        
        vote_average_gte = request.args.get('vote_average.gte', type=float)
        if vote_average_gte:
            params['vote_average.gte'] = vote_average_gte
        
        with_original_language = request.args.get('with_original_language')
        if with_original_language:
            params['with_original_language'] = with_original_language
        
        response = TMDBApi.discover_tv_shows(params)
        
        if 'error' in response:
            return jsonify({'message': response['error']}), 500
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error discovering TV shows: {e}")
        return jsonify({'message': 'Error discovering TV shows'}), 500

@tv_shows_bp.route('/<int:tv_id>/rate', methods=['POST'])
@token_required
@has_subscription
def rate_tv_show(tv_id):
    """Rate a TV show"""
    data = request.get_json()
    user_id = request.user['user_id']
    
    # Check if rating is provided
    if 'rating' not in data:
        return jsonify({'message': 'Missing rating'}), 400
    
    rating = data['rating']
    
    # Validate rating
    try:
        rating = int(rating)
        if rating < 1 or rating > 10:
            return jsonify({'message': 'Rating must be between 1 and 10'}), 400
    except ValueError:
        return jsonify({'message': 'Rating must be an integer'}), 400
    
    review = data.get('review', '')
    
    try:
        # Check if user has already rated this TV show
        existing_rating = Database.get_single_result(
            """
            SELECT rating_id
            FROM user_ratings
            WHERE user_id = %s AND content_id = %s
            """,
            (user_id, f"tv_{tv_id}")
        )
        
        if existing_rating:
            # Update existing rating
            Database.execute_query(
                """
                UPDATE user_ratings
                SET rating = %s, review = %s, created_at = NOW()
                WHERE rating_id = %s
                """,
                (rating, review, existing_rating['rating_id']),
                fetch=False
            )
            
            message = 'TV show rating updated successfully'
        else:
            # Insert new rating
            Database.execute_query(
                """
                INSERT INTO user_ratings (user_id, content_id, rating, review)
                VALUES (%s, %s, %s, %s)
                """,
                (user_id, f"tv_{tv_id}", rating, review),
                fetch=False
            )
            
            message = 'TV show rated successfully'
        
        return jsonify({'message': message, 'rating': rating}), 200
        
    except Exception as e:
        logger.error(f"Error rating TV show: {e}")
        return jsonify({'message': 'Error rating TV show'}), 500

@tv_shows_bp.route('/<int:tv_id>/rating', methods=['GET'])
@token_required
def get_tv_show_user_rating(tv_id):
    """Get current user's rating for a TV show"""
    user_id = request.user['user_id']
    
    try:
        rating = Database.get_single_result(
            """
            SELECT rating_id, rating, review, created_at
            FROM user_ratings
            WHERE user_id = %s AND content_id = %s
            """,
            (user_id, f"tv_{tv_id}")
        )
        
        if rating:
            return jsonify(rating), 200
        else:
            return jsonify({'message': 'No rating found for this TV show'}), 404
            
    except Exception as e:
        logger.error(f"Error getting TV show rating: {e}")
        return jsonify({'message': 'Error getting TV show rating'}), 500 