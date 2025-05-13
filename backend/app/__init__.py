from flask import Flask
from flask_cors import CORS
import os
import logging

# Import routes
from app.routes.auth import auth_bp
from app.routes.users import users_bp
from app.routes.subscriptions import subscriptions_bp
from app.routes.access_codes import access_codes_bp
from app.routes.movies import movies_bp
from app.routes.tv_shows import tv_shows_bp
from app.routes.search import search_bp
from app.routes.admin import admin_bp
from app.routes.favorites import favorites_bp
from app.routes.watch_history import watch_history_bp
from app.routes.profiles import profiles_bp
from app.routes.user_profile import user_profile_bp
from app.utils.auth import auth_debug_bp

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app(config_name='development'):
    """
    Application factory function
    
    Args:
        config_name (str): Configuration name (development, testing, production)
        
    Returns:
        Flask: Flask application instance
    """
    # Create and configure the app
    app = Flask(__name__)
    
    # Import and set configuration
    from app.config.config import config_by_name
    app.config.from_object(config_by_name[config_name])
    
    # Setup CORS with appropriate settings
    cors_origins = app.config.get('CORS_ORIGINS', 'http://localhost:3000')
    
    CORS(app, resources={r"/api/*": {
        "origins": cors_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "automatic_options": True,  # Automatically handle OPTIONS requests
        "vary_header": True
    }})
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(subscriptions_bp, url_prefix='/api/subscriptions')
    app.register_blueprint(access_codes_bp, url_prefix='/api/access')
    app.register_blueprint(movies_bp, url_prefix='/api/movies')
    app.register_blueprint(tv_shows_bp, url_prefix='/api/tv')
    app.register_blueprint(search_bp, url_prefix='/api/search')
    app.register_blueprint(favorites_bp, url_prefix='/api/favorites')
    app.register_blueprint(watch_history_bp, url_prefix='/api/history')
    app.register_blueprint(user_profile_bp, url_prefix='/api/profile')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(auth_debug_bp, url_prefix='/api/debug')
    
    # Create upload directory if it doesn't exist
    os.makedirs(app.config.get('UPLOAD_FOLDER'), exist_ok=True)
    
    # Register error handlers
    @app.errorhandler(404)
    def handle_404(error):
        return {'message': 'Resource not found'}, 404
    
    @app.errorhandler(500)
    def handle_500(error):
        logger.error(f"Internal server error: {error}")
        return {'message': 'Internal server error'}, 500
    
    @app.route('/api/health')
    def health_check():
        return {'status': 'healthy'}, 200
    
    # Log when app is created
    logger.info(f"Application created with {config_name} configuration")
    
    return app 