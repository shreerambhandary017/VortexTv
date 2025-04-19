from flask import Blueprint, request, jsonify
from app.utils.auth import token_required
from app.utils.tmdb import TMDBApi
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
search_bp = Blueprint('search', __name__)

@search_bp.route('/multi', methods=['GET'])
@token_required
def search_multi():
    """Search for movies, TV shows, and people"""
    try:
        query = request.args.get('query', '')
        page = request.args.get('page', 1, type=int)
        
        if not query:
            return jsonify({'message': 'Missing search query'}), 400
        
        response = TMDBApi.search_multi(query, page)
        
        if 'error' in response:
            return jsonify({'message': response['error']}), 500
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error in multi search: {e}")
        return jsonify({'message': 'Error performing search'}), 500

@search_bp.route('/movies', methods=['GET'])
@token_required
def search_movies():
    """Search for movies"""
    try:
        query = request.args.get('query', '')
        page = request.args.get('page', 1, type=int)
        
        if not query:
            return jsonify({'message': 'Missing search query'}), 400
        
        response = TMDBApi.search_movies(query, page)
        
        if 'error' in response:
            return jsonify({'message': response['error']}), 500
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error in movie search: {e}")
        return jsonify({'message': 'Error searching for movies'}), 500

@search_bp.route('/tv-shows', methods=['GET'])
@token_required
def search_tv_shows():
    """Search for TV shows"""
    try:
        query = request.args.get('query', '')
        page = request.args.get('page', 1, type=int)
        
        if not query:
            return jsonify({'message': 'Missing search query'}), 400
        
        response = TMDBApi.search_tv_shows(query, page)
        
        if 'error' in response:
            return jsonify({'message': response['error']}), 500
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error in TV show search: {e}")
        return jsonify({'message': 'Error searching for TV shows'}), 500 