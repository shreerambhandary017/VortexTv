from flask import Blueprint, request, jsonify
from app.utils.database import Database
from app.utils.auth import token_required
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
user_profile_bp = Blueprint('user_profile', __name__)

@user_profile_bp.route('/', methods=['GET'])
@token_required
def get_profile():
    """Get user profile information"""
    try:
        user_id = request.user['user_id']
        
        # Get user profile information
        user = Database.get_single_result(
            """
            SELECT u.user_id, u.username, u.email, u.created_at, u.last_login,
                   r.role_name, IFNULL(COUNT(DISTINCT h.history_id), 0) as watch_count,
                   IFNULL(COUNT(DISTINCT f.favorite_id), 0) as favorites_count
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            LEFT JOIN watch_history h ON u.user_id = h.user_id
            LEFT JOIN favorites f ON u.user_id = f.user_id
            WHERE u.user_id = %s
            GROUP BY u.user_id
            """,
            (user_id,)
        )
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Get active subscription if any
        subscription = Database.get_single_result(
            """
            SELECT plan_id, start_date, end_date, is_active
            FROM subscriptions
            WHERE user_id = %s AND is_active = TRUE AND end_date > NOW()
            ORDER BY end_date DESC
            LIMIT 1
            """,
            (user_id,)
        )
        
        # Get subscription plan details if subscription exists
        plan = None
        if subscription:
            plan = Database.get_single_result(
                """
                SELECT plan_name, description, price, duration_months
                FROM subscription_plans
                WHERE plan_id = %s
                """,
                (subscription['plan_id'],)
            )
            
            subscription['plan'] = plan
        
        # Get active access code if any
        access_code = Database.get_single_result(
            """
            SELECT code, expires_at, created_at
            FROM access_codes
            WHERE used_by = %s AND is_active = TRUE AND expires_at > NOW()
            ORDER BY expires_at DESC
            LIMIT 1
            """,
            (user_id,)
        )
        
        return jsonify({
            'profile': user,
            'subscription': subscription,
            'access_code': access_code
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting user profile: {e}")
        return jsonify({'message': 'Error getting user profile'}), 500

@user_profile_bp.route('/', methods=['PUT'])
@token_required
def update_profile():
    """Update user profile information"""
    data = request.get_json()
    user_id = request.user['user_id']
    
    # Fields that can be updated
    allowed_fields = ['username', 'email']
    update_fields = []
    update_values = []
    
    # Build update query
    for field in allowed_fields:
        if field in data:
            update_fields.append(f"{field} = %s")
            update_values.append(data[field])
    
    # Check if there are fields to update
    if not update_fields:
        return jsonify({'message': 'No fields to update'}), 400
    
    # Check if username already exists
    if 'username' in data:
        existing_user = Database.get_single_result(
            "SELECT user_id FROM users WHERE username = %s AND user_id != %s",
            (data['username'], user_id)
        )
        
        if existing_user:
            return jsonify({'message': 'Username already exists'}), 409
    
    # Check if email already exists
    if 'email' in data:
        existing_user = Database.get_single_result(
            "SELECT user_id FROM users WHERE email = %s AND user_id != %s",
            (data['email'], user_id)
        )
        
        if existing_user:
            return jsonify({'message': 'Email already exists'}), 409
    
    try:
        # Build and execute update query
        update_query = f"""
        UPDATE users
        SET {', '.join(update_fields)}
        WHERE user_id = %s
        """
        
        update_values.append(user_id)
        
        Database.execute_query(update_query, tuple(update_values), fetch=False)
        
        # Log audit
        Database.execute_query(
            """
            INSERT INTO audit_log (user_id, action, details, ip_address)
            VALUES (%s, %s, %s, %s)
            """,
            (
                user_id,
                'update_profile',
                f"User updated profile information",
                request.remote_addr
            ),
            fetch=False
        )
        
        # Get updated user
        updated_user = Database.get_single_result(
            """
            SELECT user_id, username, email, created_at, last_login
            FROM users
            WHERE user_id = %s
            """,
            (user_id,)
        )
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': updated_user
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating user profile: {e}")
        return jsonify({'message': 'Error updating user profile'}), 500

@user_profile_bp.route('/password', methods=['PUT'])
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