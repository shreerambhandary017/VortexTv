from flask import Blueprint, request, jsonify
from app.utils.database import Database
from app.utils.auth import token_required, has_subscription
from app.utils.tmdb import TMDBApi
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
movies_bp = Blueprint('movies', __name__)

@movies_bp.route('/popular', methods=['GET'])
@token_required
def get_popular_movies():
    """Get popular movies"""
    try:
        page = request.args.get('page', 1, type=int)
        response = TMDBApi.get_popular_movies(page)
        
        if 'error' in response:
            return jsonify({'message': response['error']}), 500
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error getting popular movies: {e}")
        return jsonify({'message': 'Error getting popular movies'}), 500

@movies_bp.route('/trending', methods=['GET'])
@token_required
def get_trending_movies():
    """Get trending movies"""
    try:
        time_window = request.args.get('time_window', 'week')
        if time_window not in ['day', 'week']:
            time_window = 'week'
        
        response = TMDBApi.get_trending_movies(time_window)
        
        if 'error' in response:
            return jsonify({'message': response['error']}), 500
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error getting trending movies: {e}")
        return jsonify({'message': 'Error getting trending movies'}), 500

@movies_bp.route('/top-rated', methods=['GET'])
@token_required
def get_top_rated_movies():
    """Get top rated movies"""
    try:
        page = request.args.get('page', 1, type=int)
        response = TMDBApi.get_top_rated_movies(page)
        
        if 'error' in response:
            return jsonify({'message': response['error']}), 500
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error getting top rated movies: {e}")
        return jsonify({'message': 'Error getting top rated movies'}), 500

@movies_bp.route('/upcoming', methods=['GET'])
@token_required
def get_upcoming_movies():
    """Get upcoming movies"""
    try:
        page = request.args.get('page', 1, type=int)
        response = TMDBApi.get_upcoming_movies(page)
        
        if 'error' in response:
            return jsonify({'message': response['error']}), 500
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error getting upcoming movies: {e}")
        return jsonify({'message': 'Error getting upcoming movies'}), 500

@movies_bp.route('/<int:movie_id>', methods=['GET'])
@token_required
@has_subscription
def get_movie_details(movie_id):
    """Get movie details"""
    try:
        response = TMDBApi.get_movie_details(movie_id)
        
        if 'error' in response:
            return jsonify({'message': response['error']}), 500
        
        # Track this view in user's watch history
        user_id = request.user['user_id']
        
        # Check if movie is already in watch history
        existing_entry = Database.get_single_result(
            """
            SELECT history_id
            FROM watch_history
            WHERE user_id = %s AND content_id = %s
            """,
            (user_id, str(movie_id))
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
                (user_id, str(movie_id)),
                fetch=False
            )
        
        # Check if movie is in user's favorites
        is_favorite = Database.get_single_result(
            """
            SELECT favorite_id
            FROM favorites
            WHERE user_id = %s AND content_id = %s
            """,
            (user_id, str(movie_id))
        )
        
        response['is_favorite'] = is_favorite is not None
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error getting movie details: {e}")
        return jsonify({'message': 'Error getting movie details'}), 500

@movies_bp.route('/genres', methods=['GET'])
@token_required
def get_movie_genres():
    """Get movie genres"""
    try:
        response = TMDBApi.get_movie_genres()
        
        if 'error' in response:
            return jsonify({'message': response['error']}), 500
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error getting movie genres: {e}")
        return jsonify({'message': 'Error getting movie genres'}), 500

@movies_bp.route('/discover', methods=['GET'])
@token_required
def discover_movies():
    """Discover movies based on filters"""
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
        
        year = request.args.get('year', type=int)
        if year:
            params['year'] = year
        
        primary_release_year = request.args.get('primary_release_year', type=int)
        if primary_release_year:
            params['primary_release_year'] = primary_release_year
        
        vote_average_gte = request.args.get('vote_average.gte', type=float)
        if vote_average_gte:
            params['vote_average.gte'] = vote_average_gte
        
        with_original_language = request.args.get('with_original_language')
        if with_original_language:
            params['with_original_language'] = with_original_language
        
        response = TMDBApi.discover_movies(params)
        
        if 'error' in response:
            return jsonify({'message': response['error']}), 500
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error discovering movies: {e}")
        return jsonify({'message': 'Error discovering movies'}), 500

@movies_bp.route('/<int:movie_id>/rate', methods=['POST'])
@token_required
@has_subscription
def rate_movie(movie_id):
    """Rate a movie"""
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
        # Check if user has already rated this movie
        existing_rating = Database.get_single_result(
            """
            SELECT rating_id
            FROM user_ratings
            WHERE user_id = %s AND content_id = %s
            """,
            (user_id, str(movie_id))
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
            
            message = 'Movie rating updated successfully'
        else:
            # Insert new rating
            Database.execute_query(
                """
                INSERT INTO user_ratings (user_id, content_id, rating, review)
                VALUES (%s, %s, %s, %s)
                """,
                (user_id, str(movie_id), rating, review),
                fetch=False
            )
            
            message = 'Movie rated successfully'
        
        return jsonify({'message': message, 'rating': rating}), 200
        
    except Exception as e:
        logger.error(f"Error rating movie: {e}")
        return jsonify({'message': 'Error rating movie'}), 500

@movies_bp.route('/<int:movie_id>/rating', methods=['GET'])
@token_required
def get_movie_user_rating(movie_id):
    """Get current user's rating for a movie"""
    user_id = request.user['user_id']
    
    try:
        rating = Database.get_single_result(
            """
            SELECT rating_id, rating, review, created_at
            FROM user_ratings
            WHERE user_id = %s AND content_id = %s
            """,
            (user_id, str(movie_id))
        )
        
        if rating:
            return jsonify(rating), 200
        else:
            return jsonify({'message': 'No rating found for this movie'}), 404
            
    except Exception as e:
        logger.error(f"Error getting movie rating: {e}")
        return jsonify({'message': 'Error getting movie rating'}), 500 