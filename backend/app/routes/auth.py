from flask import Blueprint, request, jsonify
from app.utils.database import Database
from app.utils.auth import hash_password, verify_password, generate_token, token_required
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    
    # Check if required fields are provided
    required_fields = ['username', 'email', 'password']
    for field in required_fields:
        if field not in data:
            return jsonify({'message': f'Missing required field: {field}'}), 400
    
    # Check if username or email already exists
    existing_user = Database.get_single_result(
        "SELECT user_id FROM users WHERE username = %s OR email = %s",
        (data['username'], data['email'])
    )
    
    if existing_user:
        return jsonify({'message': 'Username or email already exists'}), 409
    
    # Hash password
    hashed_password = hash_password(data['password'])
    
    # Default role is 'user' (role_id=3)
    role_id = 3
    
    try:
        # Insert user into database
        user_id = Database.execute_query(
            """
            INSERT INTO users (username, email, password, role_id)
            VALUES (%s, %s, %s, %s)
            """,
            (data['username'], data['email'], hashed_password, role_id),
            fetch=False
        )
        
        # Get role name
        role = Database.get_single_result(
            "SELECT role_name FROM roles WHERE role_id = %s",
            (role_id,)
        )
        
        # Generate token
        token = generate_token(user_id, role['role_name'])
        
        # Log audit
        Database.execute_query(
            """
            INSERT INTO audit_log (user_id, action, details, ip_address)
            VALUES (%s, %s, %s, %s)
            """,
            (
                user_id,
                'register',
                f"User registered with username {data['username']}",
                request.remote_addr
            ),
            fetch=False
        )
        
        return jsonify({
            'message': 'User registered successfully',
            'user_id': user_id,
            'token': token
        }), 201
        
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        return jsonify({'message': 'Error registering user'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login a user"""
    data = request.get_json()
    
    # Check if required fields are provided
    required_fields = ['username', 'password']
    for field in required_fields:
        if field not in data:
            return jsonify({'message': f'Missing required field: {field}'}), 400
    
    try:
        # Get user from database
        user = Database.get_single_result(
            """
            SELECT u.user_id, u.username, u.email, u.password, r.role_name
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            WHERE u.username = %s OR u.email = %s
            """,
            (data['username'], data['username'])
        )
        
        # Check if user exists
        if not user:
            return jsonify({'message': 'Invalid username or password'}), 401
        
        # Verify password
        if not verify_password(data['password'], user['password']):
            return jsonify({'message': 'Invalid username or password'}), 401
        
        # Generate token
        token = generate_token(user['user_id'], user['role_name'])
        
        # Update last login
        Database.execute_query(
            "UPDATE users SET last_login = NOW() WHERE user_id = %s",
            (user['user_id'],),
            fetch=False
        )
        
        # Log audit
        Database.execute_query(
            """
            INSERT INTO audit_log (user_id, action, details, ip_address)
            VALUES (%s, %s, %s, %s)
            """,
            (
                user['user_id'],
                'login',
                f"User logged in: {user['username']}",
                request.remote_addr
            ),
            fetch=False
        )
        
        return jsonify({
            'message': 'Login successful',
            'user_id': user['user_id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role_name'],
            'token': token
        }), 200
        
    except Exception as e:
        logger.error(f"Error logging in: {e}")
        return jsonify({'message': 'Error logging in'}), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout a user (just for API completeness, actual logout happens client-side)"""
    return jsonify({'message': 'Logout successful'}), 200

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Send password reset email"""
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
            ON CONFLICT (user_id) DO UPDATE SET
                token = EXCLUDED.token,
                expires_at = EXCLUDED.expires_at,
                created_at = NOW()
            """,
            (user['user_id'], reset_token, expiry),
            fetch=False
        )
        
        # In a real application, we would send an email here
        # For demo purposes, we'll log the reset link
        reset_link = f"http://localhost:3000/reset-password?token={reset_token}"
        logger.info(f"Password reset link for {email}: {reset_link}")
        
        # Log audit
        Database.execute_query(
            """
            INSERT INTO audit_log (user_id, action, details, ip_address)
            VALUES (%s, %s, %s, %s)
            """,
            (
                user['user_id'],
                'forgot_password',
                "Password reset requested",
                request.remote_addr
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
    
    # Check if new password is at least 8 characters
    if len(new_password) < 8:
        return jsonify({'message': 'New password must be at least 8 characters'}), 400
    
    try:
        # Find valid token
        token_data = Database.get_single_result(
            """
            SELECT t.user_id, u.username
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
        
        # Update password
        Database.execute_query(
            "UPDATE users SET password = %s WHERE user_id = %s",
            (hashed_password, token_data['user_id']),
            fetch=False
        )
        
        # Delete used token
        Database.execute_query(
            "DELETE FROM password_reset_tokens WHERE user_id = %s",
            (token_data['user_id'],),
            fetch=False
        )
        
        # Log audit
        Database.execute_query(
            """
            INSERT INTO audit_log (user_id, action, details, ip_address)
            VALUES (%s, %s, %s, %s)
            """,
            (
                token_data['user_id'],
                'reset_password',
                "Password reset completed",
                request.remote_addr
            ),
            fetch=False
        )
        
        return jsonify({'message': 'Password reset successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error resetting password: {e}")
        return jsonify({'message': 'An error occurred while resetting your password'}), 500

@auth_bp.route('/update-password', methods=['POST'])
@token_required
def update_password():
    """Update user password"""
    from app.utils.auth import hash_password, verify_password
    
    data = request.get_json()
    user_id = request.user['user_id']
    
    # Check if required fields are provided
    required_fields = ['current_password', 'new_password']
    for field in required_fields:
        if field not in data:
            return jsonify({'message': f'Missing required field: {field}'}), 400
    
    # Check if new password is at least 8 characters
    if len(data['new_password']) < 8:
        return jsonify({'message': 'New password must be at least 8 characters'}), 400
    
    try:
        # Get current password
        user = Database.get_single_result(
            "SELECT password FROM users WHERE user_id = %s",
            (user_id,)
        )
        
        # Verify current password
        if not verify_password(data['current_password'], user['password']):
            return jsonify({'message': 'Current password is incorrect'}), 401
        
        # Hash new password
        hashed_password = hash_password(data['new_password'])
        
        # Update password
        Database.execute_query(
            "UPDATE users SET password = %s WHERE user_id = %s",
            (hashed_password, user_id),
            fetch=False
        )
        
        # Log audit
        Database.execute_query(
            """
            INSERT INTO audit_log (user_id, action, details, ip_address)
            VALUES (%s, %s, %s, %s)
            """,
            (
                user_id,
                'update_password',
                "User updated password",
                request.remote_addr
            ),
            fetch=False
        )
        
        return jsonify({'message': 'Password updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error updating password: {e}")
        return jsonify({'message': 'Error updating password'}), 500 