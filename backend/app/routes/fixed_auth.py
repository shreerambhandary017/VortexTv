from flask import Blueprint, request, jsonify, current_app
from app.utils.database import Database
from app.utils.auth import hash_password, verify_password, generate_token, decode_token, revoke_token, token_required
import logging
import datetime
from app.utils.validation import validate_input, LoginSchema, RegisterSchema
from flask_limiter.util import get_remote_address
from datetime import timedelta
import jwt

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
auth_bp = Blueprint('auth', __name__)

def limiter_key():
    return get_remote_address()

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    # Apply rate limiting - 5 per hour
    limiter = current_app.extensions['limiter']
    limiter.limit("5 per hour", key_func=limiter_key)(lambda: None)()
    
    data = request.get_json()
    
    # Validate input data
    validation_result = validate_input(data, RegisterSchema)
    if validation_result['errors']:
        return jsonify({
            'message': 'Validation error',
            'errors': validation_result['errors']
        }), 400
    
    # Validated data
    validated_data = validation_result['data']
    
    # Check if username or email already exists
    existing_user = Database.get_single_result(
        "SELECT user_id FROM users WHERE username = %s OR email = %s",
        (validated_data['username'], validated_data['email'])
    )
    
    if existing_user:
        return jsonify({'message': 'Username or email already exists'}), 409
    
    # Hash password
    hashed_password = hash_password(validated_data['password'])
    
    # Default role is 'user' (role_id=3)
    role_id = 3
    
    try:
        # Insert user into database
        user_id = Database.execute_query(
            """
            INSERT INTO users (username, email, password, role_id)
            VALUES (%s, %s, %s, %s)
            """,
            (validated_data['username'], validated_data['email'], hashed_password, role_id),
            fetch=False
        )
        
        # Get role name
        role = Database.get_single_result(
            "SELECT role_name FROM roles WHERE role_id = %s",
            (role_id,)
        )
        
        # Generate token
        token = generate_token(
            user_id, 
            role['role_name'],
            request_ip=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        # Generate refresh token
        refresh_token = generate_token(
            user_id, 
            role['role_name'], 
            expiry=datetime.datetime.utcnow() + datetime.timedelta(days=30),
            is_refresh=True,
            request_ip=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        # Log audit
        Database.execute_query(
            """
            INSERT INTO audit_log (user_id, action, details, ip_address, user_agent)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                user_id,
                'register',
                f"User registered with username {validated_data['username']}",
                request.remote_addr,
                request.headers.get('User-Agent')
            ),
            fetch=False
        )
        
        return jsonify({
            'message': 'User registered successfully',
            'user_id': user_id,
            'token': token,
            'refresh_token': refresh_token
        }), 201
        
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        return jsonify({'message': 'Error registering user'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Handle user login"""
    # Apply rate limiting
    limiter = current_app.extensions['limiter']
    limiter.limit("10 per minute", key_func=limiter_key)(lambda: None)()
    
    data = request.get_json()
    
    # Validate input
    validation_errors = validate_input(LoginSchema, data)
    if validation_errors:
        return jsonify({'message': 'Validation error', 'errors': validation_errors}), 400
    
    username = data['username']
    password = data['password']
    
    # Get user from database
    user = Database.get_single_result(
        """
        SELECT u.user_id, u.username, u.email, u.password, r.role_name, u.role_id, u.failed_login_attempts, u.last_failed_login
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE u.username = %s AND u.is_active = TRUE
        """,
        (username,)
    )
    
    # Check user exists and password matches
    if not user or not verify_password(password, user['password']):
        # Track failed login attempts
        if user:
            current_time = datetime.datetime.now()
            
            # Get failed login threshold from config
            max_attempts = current_app.config.get('MAX_FAILED_LOGIN_ATTEMPTS', 5)
            lockout_minutes = current_app.config.get('FAILED_LOGIN_LOCKOUT_MINUTES', 15)
            
            # Check if we need to reset the counter (if lockout period has passed)
            if user['last_failed_login'] and user['failed_login_attempts'] >= max_attempts:
                lockout_until = user['last_failed_login'] + datetime.timedelta(minutes=lockout_minutes)
                if current_time > lockout_until:
                    # Reset counter if lockout period has passed
                    Database.execute(
                        """
                        UPDATE users SET 
                            failed_login_attempts = 1, 
                            last_failed_login = %s 
                        WHERE user_id = %s
                        """,
                        (current_time, user['user_id'])
                    )
                else:
                    # Still in lockout period, increment counter
                    Database.execute(
                        """
                        UPDATE users SET 
                            failed_login_attempts = failed_login_attempts + 1, 
                            last_failed_login = %s 
                        WHERE user_id = %s
                        """,
                        (current_time, user['user_id'])
                    )
            else:
                # Normal increment of failed attempts
                Database.execute(
                    """
                    UPDATE users SET 
                        failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1, 
                        last_failed_login = %s 
                    WHERE user_id = %s
                    """,
                    (current_time, user['user_id'])
                )
                
            # Log the failed login attempt
            Database.execute(
                """
                INSERT INTO audit_log (user_id, action, ip_address, user_agent) 
                VALUES (%s, %s, %s, %s)
                """, 
                (user['user_id'], 'FAILED_LOGIN', request.remote_addr, request.headers.get('User-Agent', 'Unknown'))
            )
        
        # Return generic error message to prevent username enumeration
        return jsonify({'message': 'Invalid username or password'}), 401
    
    # Check if account is locked due to too many failed attempts
    max_attempts = current_app.config.get('MAX_FAILED_LOGIN_ATTEMPTS', 5)
    lockout_minutes = current_app.config.get('FAILED_LOGIN_LOCKOUT_MINUTES', 15)
    
    if user['failed_login_attempts'] and user['failed_login_attempts'] >= max_attempts:
        if user['last_failed_login']:
            lockout_until = user['last_failed_login'] + datetime.timedelta(minutes=lockout_minutes)
            current_time = datetime.datetime.now()
            
            if current_time < lockout_until:
                # Account is still locked
                wait_minutes = int((lockout_until - current_time).total_seconds() / 60) + 1
                
                # Log the login attempt on locked account
                Database.execute(
                    """
                    INSERT INTO audit_log (user_id, action, ip_address, user_agent) 
                    VALUES (%s, %s, %s, %s)
                    """, 
                    (user['user_id'], 'LOCKED_ACCOUNT_ACCESS_ATTEMPT', request.remote_addr, request.headers.get('User-Agent', 'Unknown'))
                )
                
                return jsonify({
                    'message': f'Account is temporarily locked. Please try again in {wait_minutes} minute(s).',
                    'locked_until': lockout_until.isoformat()
                }), 401
    
    # If we get here, login was successful
    # Reset failed login attempts counter
    Database.execute(
        """
        UPDATE users SET 
            failed_login_attempts = 0, 
            last_failed_login = NULL,
            last_login = %s
        WHERE user_id = %s
        """,
        (datetime.datetime.now(), user['user_id'])
    )
    
    # Generate tokens (access and refresh)
    access_token = generate_token(
        user['user_id'], 
        is_refresh=False, 
        role=user['role_name'],
        request_ip=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    
    refresh_token = generate_token(
        user['user_id'], 
        is_refresh=True, 
        role=user['role_name'],
        expiry=datetime.timedelta(days=30),
        request_ip=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    
    # Log successful login
    Database.execute(
        """
        INSERT INTO audit_log (user_id, action, ip_address, user_agent) 
        VALUES (%s, %s, %s, %s)
        """, 
        (user['user_id'], 'LOGIN', request.remote_addr, request.headers.get('User-Agent', 'Unknown'))
    )
    
    # Return JWT token
    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'user_id': user['user_id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role_name']
        }
    }), 200

@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    # Get refresh token from request
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'message': 'Invalid authorization format. Use Bearer <token>'}), 401
    
    refresh_token = auth_header[7:]  # Skip 'Bearer ' prefix
    if not refresh_token:
        return jsonify({'message': 'Refresh token is missing'}), 401
    
    # Decode token
    payload = decode_token(refresh_token)
    
    if 'error' in payload:
        return jsonify({'message': payload['error']}), 401
    
    # Check if token is a refresh token
    if not payload.get('refresh', False):
        return jsonify({'message': 'Invalid refresh token'}), 401
        
    # Get user from database
    user_id = payload.get('sub')
    if not user_id:
        return jsonify({'message': 'Invalid token payload'}), 401
        
    # Check if the token is from the same IP if IP was stored
    if 'ip' in payload and payload['ip'] != request.remote_addr:
        logger.warning(f"IP address mismatch during token refresh: {payload['ip']} != {request.remote_addr}")
        return jsonify({'message': 'Token was issued for a different IP address'}), 401
        
    user = Database.get_single_result(
        """
        SELECT u.user_id, u.username, u.email, r.role_name, u.role_id
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE u.user_id = %s AND u.is_active = TRUE
        """,
        (user_id,)
    )
    
    if not user:
        return jsonify({'message': 'User not found or inactive'}), 401
    
    # Generate new tokens
    access_token = generate_token(
        user_id, 
        is_refresh=False,
        role=user['role_name'],
        request_ip=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    
    new_refresh_token = generate_token(
        user_id, 
        is_refresh=True,
        role=user['role_name'],
        expiry=timedelta(days=30),
        request_ip=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    
    # Log successful token refresh
    Database.execute(
        """
        INSERT INTO audit_log (user_id, action, ip_address, user_agent) 
        VALUES (%s, %s, %s, %s)
        """,
        (user_id, 'TOKEN_REFRESH', request.remote_addr, request.headers.get('User-Agent', 'Unknown'))
    )
    
    return jsonify({
        'access_token': access_token,
        'refresh_token': new_refresh_token,
        'user': {
            'user_id': user['user_id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role_name']
        }
    })

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user):
    """
    Logout user by revoking current token
    """
    try:
        # Extract token from authorization header
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(" ")[1] if auth_header else None
        
        if not token:
            return jsonify({'error': 'No token provided'}), 400
            
        # Revoke the token
        result = revoke_token(token)
        
        if result['success']:
            return jsonify({'message': 'Logged out successfully'}), 200
        else:
            return jsonify({'error': result['message']}), 400
            
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Send password reset email"""
    # Apply rate limiting - 5 per hour
    limiter = current_app.extensions['limiter']
    limiter.limit("5 per hour", key_func=limiter_key)(lambda: None)()
    
    data = request.get_json()
    
    # Check if email is provided
    if 'email' not in data:
        return jsonify({'message': 'Missing email'}), 400
    
    email = data['email']
    
    try:
        # Find user by email
        user = Database.get_single_result(
            "SELECT user_id, username FROM users WHERE email = %s",
            (email,)
        )
        
        if not user:
            # Don't reveal if email exists for security
            return jsonify({'message': 'If your email is registered, you will receive a password reset link shortly'}), 200
        
        # Generate reset token (valid for 1 hour)
        import secrets
        import datetime
        reset_token = secrets.token_urlsafe(32)
        expiry = datetime.datetime.now() + datetime.timedelta(hours=1)
        
        # Store token in database
        Database.execute_query(
            """
            INSERT INTO password_reset_tokens (user_id, token, expires_at)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE
                token = VALUES(token),
                expires_at = VALUES(expires_at),
                created_at = NOW()
            """,
            (user['user_id'], reset_token, expiry),
            fetch=False
        )
        
        # In a real application, send an email here using Flask-Mail
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:3000')
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        
        if current_app.config.get('MAIL_SERVER'):
            try:
                # Placeholder for email sending logic
                logger.info(f"Would send password reset email to {email} with link: {reset_link}")
                # In a real app, use Flask-Mail to send the email
            except Exception as email_err:
                logger.error(f"Error sending password reset email: {email_err}")
        else:
            # For development, log the reset link
            logger.info(f"Password reset link for {email}: {reset_link}")
        
        # Log audit
        Database.execute_query(
            """
            INSERT INTO audit_log (user_id, action, details, ip_address, user_agent)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                user['user_id'],
                'forgot_password',
                "Password reset requested",
                request.remote_addr,
                request.headers.get('User-Agent')
            ),
            fetch=False
        )
        
        return jsonify({'message': 'If your email is registered, you will receive a password reset link shortly'}), 200
        
    except Exception as e:
        logger.error(f"Error processing password reset request: {e}")
        return jsonify({'message': 'An error occurred while processing your request'}), 500

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password using token"""
    data = request.get_json()
    
    # Check if required fields are provided
    required_fields = ['token', 'new_password']
    for field in required_fields:
        if field not in data:
            return jsonify({'message': f'Missing required field: {field}'}), 400
    
    token = data['token']
    new_password = data['new_password']
    
    # Password validation
    if len(new_password) < 8:
        return jsonify({'message': 'New password must be at least 8 characters'}), 400
    
    try:
        # Find valid token
        token_data = Database.get_single_result(
            """
            SELECT t.user_id, u.username, u.email
            FROM password_reset_tokens t
            JOIN users u ON t.user_id = u.user_id
            WHERE t.token = %s AND t.expires_at > NOW()
            """,
            (token,)
        )
        
        if not token_data:
            return jsonify({'message': 'Invalid or expired token'}), 400
        
        # Hash new password
        hashed_password = hash_password(new_password)
        
        # Update password and track reset data
        Database.execute_query(
            """
            UPDATE users 
            SET password = %s, 
                password_reset_at = NOW(), 
                last_password_reset_ip = %s
            WHERE user_id = %s
            """,
            (hashed_password, request.remote_addr, token_data['user_id']),
            fetch=False
        )
        
        # Delete used token
        Database.execute_query(
            "DELETE FROM password_reset_tokens WHERE user_id = %s",
            (token_data['user_id'],),
            fetch=False
        )
        
        # Log audit with more detailed information
        Database.execute_query(
            """
            INSERT INTO audit_log (user_id, action, details, ip_address, user_agent)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                token_data['user_id'],
                'reset_password',
                f"Password reset completed for {token_data['username']} ({token_data['email']})",
                request.remote_addr,
                request.headers.get('User-Agent')
            ),
            fetch=False
        )
        
        return jsonify({'message': 'Password reset successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error resetting password: {e}")
        return jsonify({'message': 'An error occurred while resetting your password'}), 500

@auth_bp.route('/revoke-token', methods=['POST'])
@token_required
def revoke_token_endpoint(current_user):
    """
    Explicitly revoke a specified token
    
    Request body:
    {
        "token": "jwt_token_to_revoke"  # Optional, if not provided, revokes the current token
    }
    """
    try:
        data = request.get_json()
        
        # If token is provided in request body, use that
        if data and 'token' in data:
            token = data['token']
        else:
            # Otherwise use the current token
            auth_header = request.headers.get('Authorization')
            token = auth_header.split(" ")[1] if auth_header else None
        
        if not token:
            return jsonify({'error': 'No token provided'}), 400
            
        # Check if user has permission to revoke this token
        # Only admins can revoke other users' tokens
        if current_user['role'] != 'admin':
            # For non-admins, decode token to check ownership
            payload = decode_token(token)
            if 'error' in payload:
                return jsonify({'error': payload['error']}), 400
                
            token_user_id = payload.get('sub')
            if str(token_user_id) != str(current_user['id']):
                return jsonify({'error': 'Unauthorized to revoke this token'}), 403
        
        # Revoke the token
        result = revoke_token(token)
        
        if result['success']:
            return jsonify({'message': 'Token revoked successfully'}), 200
        else:
            return jsonify({'error': result['message']}), 400
            
    except Exception as e:
        logger.error(f"Token revocation error: {e}")
        return jsonify({'error': str(e)}), 500 