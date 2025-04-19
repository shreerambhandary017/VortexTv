import jwt
import bcrypt
import datetime
from functools import wraps
from flask import request, jsonify, current_app, Blueprint
from app.utils.database import Database
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create debug blueprint
auth_debug_bp = Blueprint('auth_debug', __name__)

@auth_debug_bp.route('/test-token', methods=['GET'])
def test_token():
    """Test endpoint to verify token generation and validation"""
    # Generate a test token for user ID 1 with role 'superadmin'
    test_token = generate_token(1, 'superadmin')
    
    # Decode the token to validate it works
    decoded = None
    error = None
    try:
        decoded = jwt.decode(
            test_token,
            current_app.config.get('JWT_SECRET_KEY'),
            algorithms=['HS256']
        )
    except Exception as e:
        error = str(e)
    
    return jsonify({
        'token': test_token,
        'decoded': decoded,
        'error': error,
        'config': {
            'secret_key_length': len(current_app.config.get('JWT_SECRET_KEY')),
            'secret_key_sample': current_app.config.get('JWT_SECRET_KEY')[:5] + '...'
        }
    }), 200

def hash_password(password):
    """
    Hash a password using bcrypt
    
    Args:
        password (str): The password to hash
        
    Returns:
        str: The hashed password
    """
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, hashed_password):
    """
    Verify a password against a hash
    
    Args:
        password (str): The password to verify
        hashed_password (str): The hashed password to check against
        
    Returns:
        bool: True if password matches, False otherwise
    """
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def generate_token(user_id, role, expiry=None):
    """
    Generate a JWT token for a user
    
    Args:
        user_id (int): User ID
        role (str): User role
        expiry (datetime, optional): Token expiry time
        
    Returns:
        str: JWT token
    """
    if expiry is None:
        expiry = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    
    payload = {
        'exp': expiry,
        'iat': datetime.datetime.utcnow(),
        'sub': user_id,
        'role': role
    }
    
    return jwt.encode(
        payload,
        current_app.config.get('JWT_SECRET_KEY'),
        algorithm='HS256'
    )

def decode_token(token):
    """
    Decode a JWT token
    
    Args:
        token (str): The JWT token to decode
        
    Returns:
        dict: The decoded token payload
    """
    try:
        return jwt.decode(
            token,
            current_app.config.get('JWT_SECRET_KEY'),
            algorithms=['HS256']
        )
    except jwt.ExpiredSignatureError:
        return {'error': 'Token expired. Please log in again.'}
    except jwt.InvalidTokenError:
        return {'error': 'Invalid token. Please log in again.'}

def token_required(f):
    """
    Decorator to require a valid JWT token for route access
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            logger.info(f"Auth header: {auth_header[:15]}...")
            
            try:
                # Make sure we're handling 'Bearer <token>' format correctly
                if auth_header.startswith('Bearer '):
                    token = auth_header[7:]  # Skip 'Bearer ' prefix
                else:
                    parts = auth_header.split()
                    if len(parts) == 2 and parts[0].lower() == 'bearer':
                        token = parts[1]
                    else:
                        return jsonify({'message': 'Invalid authorization format. Use Bearer <token>'}), 401
            except IndexError:
                logger.error(f"Malformed Authorization header: {auth_header}")
                return jsonify({'message': 'Token is missing or invalid'}), 401
        
        if not token:
            logger.error("No token provided in request")
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            # Decode token
            logger.info(f"Decoding token: {token[:10]}...")
            payload = decode_token(token)
            
            if 'error' in payload:
                logger.error(f"Token decode error: {payload['error']}")
                return jsonify({'message': payload['error']}), 401
            
            # Get user from database
            user_id = payload.get('sub')
            if not user_id:
                logger.error("Token payload missing 'sub' field")
                return jsonify({'message': 'Invalid token payload'}), 401
                
            logger.info(f"Looking up user ID: {user_id}")
            user = Database.get_single_result(
                "SELECT user_id, username, email, role_id FROM users WHERE user_id = %s",
                (user_id,)
            )
            
            if not user:
                logger.error(f"User not found for ID: {user_id}")
                return jsonify({'message': 'User not found'}), 401
            
            # Get role name
            role = Database.get_single_result(
                "SELECT role_name FROM roles WHERE role_id = %s",
                (user['role_id'],)
            )
            
            if not role:
                logger.error(f"Role not found for role_id: {user['role_id']}")
                return jsonify({'message': 'Role not found'}), 401
            
            # Add user and role to request context
            request.user = user
            request.user['role'] = role['role_name']
            logger.info(f"User authenticated: {user['username']} with role {role['role_name']}")
            
        except Exception as e:
            logger.error(f"Error in token validation: {e}")
            return jsonify({'message': 'Token is invalid'}), 401
        
        return f(*args, **kwargs)
    
    return decorated

def admin_required(f):
    """
    Decorator to require admin or superadmin role
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # This decorator assumes token_required has already been applied
        if not hasattr(request, 'user') or not request.user:
            return jsonify({'message': 'Authentication required'}), 401
        
        if request.user['role'] not in ['admin', 'superadmin']:
            return jsonify({'message': 'Admin privileges required'}), 403
        
        return f(*args, **kwargs)
    
    return decorated

def superadmin_required(f):
    """
    Decorator to require superadmin role
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # This decorator assumes token_required has already been applied
        if not hasattr(request, 'user') or not request.user:
            return jsonify({'message': 'Authentication required'}), 401
        
        if request.user['role'] != 'superadmin':
            return jsonify({'message': 'Superadmin privileges required'}), 403
        
        return f(*args, **kwargs)
    
    return decorated

def has_subscription(f):
    """
    Decorator to check if user has active subscription or valid access code
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # This decorator assumes token_required has already been applied
        if not hasattr(request, 'user') or not request.user:
            return jsonify({'message': 'Authentication required'}), 401
        
        user_id = request.user['user_id']
        
        # Check for active subscription
        subscription = Database.get_single_result(
            """
            SELECT subscription_id 
            FROM subscriptions 
            WHERE user_id = %s AND is_active = TRUE AND end_date > NOW()
            """,
            (user_id,)
        )
        
        # Check for valid access code
        access_code = Database.get_single_result(
            """
            SELECT code_id 
            FROM access_codes 
            WHERE used_by = %s AND is_active = TRUE AND expires_at > NOW()
            """,
            (user_id,)
        )
        
        # If user is admin or superadmin, allow access without subscription
        if request.user['role'] in ['admin', 'superadmin']:
            return f(*args, **kwargs)
        
        # If no subscription or access code found, deny access
        if not subscription and not access_code:
            return jsonify({
                'message': 'Subscription required to access this content',
                'subscription_required': True
            }), 403
        
        return f(*args, **kwargs)
    
    return decorated 