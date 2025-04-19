import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    # Flask configurations
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev_secret_key_change_in_production')
    DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 't')
    
    # Database configurations
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'Sasha@1712')
    DB_NAME = os.getenv('DB_NAME', 'vortextv')
    DB_PORT = int(os.getenv('DB_PORT', 3306))
    
    # JWT configurations
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt_dev_secret_key_change_in_production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # TMDB API configurations
    TMDB_API_KEY = os.getenv('TMDB_API_KEY', 'b76df244c74bfa8348a64730afdaafeb')
    TMDB_API_BASE_URL = 'https://api.themoviedb.org/3'
    TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'
    
    # File storage configurations
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload size
    
    # CORS configurations
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')

class DevelopmentConfig(Config):
    DEBUG = True
    
class TestingConfig(Config):
    TESTING = True
    DEBUG = True
    DB_NAME = 'vortextv_test'
    
class ProductionConfig(Config):
    DEBUG = False
    
    # Override with stronger keys in production
    SECRET_KEY = os.getenv('SECRET_KEY', None)
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', None)
    
    # Ensure these are set in production
    if not SECRET_KEY or not JWT_SECRET_KEY:
        raise ValueError("SECRET_KEY and JWT_SECRET_KEY must be set in production")

# Configuration dictionary
config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig
}

# Get active configuration
active_config = config_by_name[os.getenv('FLASK_ENV', 'development')] 