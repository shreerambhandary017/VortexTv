from flask import Blueprint, request, jsonify
from app.utils.database import Database
from app.utils.auth import token_required, admin_required, superadmin_required, hash_password
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
users_bp = Blueprint('users', __name__)

@users_bp.route('/me', methods=['GET'])
@token_required
def get_current_user():
    """Get current user information"""
    user_id = request.user['user_id']
    
    try:
        # Get user details
        user = Database.get_single_result(
            """
            SELECT u.user_id, u.username, u.email, r.role_name as role,
                  u.created_at, u.last_login
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            WHERE u.user_id = %s
            """,
            (user_id,)
        )
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Check if user has active subscription
        subscription = Database.get_single_result(
            """
            SELECT s.subscription_id, p.plan_name, s.start_date, s.end_date,
                  p.max_access_codes
            FROM subscriptions s
            JOIN subscription_plans p ON s.plan_id = p.plan_id
            WHERE s.user_id = %s AND s.is_active = TRUE AND s.end_date > NOW()
            """,
            (user_id,)
        )
        
        # Check if user has valid access code
        access_code = Database.get_single_result(
            """
            SELECT ac.code_id, ac.code, s.end_date as expires_at
            FROM access_codes ac
            JOIN subscriptions s ON ac.subscription_id = s.subscription_id
            WHERE ac.used_by = %s AND ac.is_active = TRUE AND s.end_date > NOW()
            """,
            (user_id,)
        )
        
        # Add subscription info to user data
        user['hasSubscription'] = subscription is not None
        user['hasAccessCode'] = access_code is not None
        
        if subscription:
            user['subscription'] = subscription
            
            # Count generated access codes
            access_codes_count = Database.get_single_result(
                """
                SELECT COUNT(*) as count
                FROM access_codes
                WHERE created_by = %s AND subscription_id = %s
                """,
                (user_id, subscription['subscription_id'])
            )
            
            user['subscription']['accessCodesGenerated'] = access_codes_count['count'] if access_codes_count else 0
            
        if access_code:
            user['accessCode'] = access_code
        
        return jsonify(user), 200
        
    except Exception as e:
        logger.error(f"Error getting user info: {e}")
        return jsonify({'message': 'Error getting user information'}), 500

@users_bp.route('/<int:user_id>', methods=['GET'])
@token_required
@admin_required
def get_user(user_id):
    """Get a specific user by ID (admin only)"""
    try:
        # Get user details
        user = Database.get_single_result(
            """
            SELECT u.user_id, u.username, u.email, r.role_name as role,
                  u.created_at, u.last_login, u.is_active
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            WHERE u.user_id = %s
            """,
            (user_id,)
        )
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
            
        # Get subscription info
        subscription = Database.get_single_result(
            """
            SELECT s.subscription_id, p.plan_name, s.start_date, s.end_date,
                  s.is_active, s.payment_status
            FROM subscriptions s
            JOIN subscription_plans p ON s.plan_id = p.plan_id
            WHERE s.user_id = %s AND s.is_active = TRUE
            ORDER BY s.end_date DESC
            LIMIT 1
            """,
            (user_id,)
        )
        
        if subscription:
            user['subscription'] = subscription
        
        return jsonify(user), 200
        
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        return jsonify({'message': 'Error getting user'}), 500

@users_bp.route('', methods=['GET'])
@token_required
@admin_required
def get_all_users():
    """Get all users (admin only)"""
    try:
        # Get query parameters for pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        offset = (page - 1) * per_page
        
        # Get users with pagination
        users = Database.execute_query(
            """
            SELECT u.user_id, u.username, u.email, r.role_name as role,
                  u.created_at, u.last_login, u.is_active
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            ORDER BY u.created_at DESC
            LIMIT %s OFFSET %s
            """,
            (per_page, offset)
        )
        
        # Get total user count
        count = Database.get_single_result(
            "SELECT COUNT(*) as count FROM users"
        )
        
        return jsonify({
            'users': users,
            'total': count['count'] if count else 0,
            'page': page,
            'per_page': per_page,
            'pages': (count['count'] // per_page) + (1 if count['count'] % per_page > 0 else 0) if count else 0
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting all users: {e}")
        return jsonify({'message': 'Error getting users'}), 500

@users_bp.route('', methods=['POST'])
@token_required
@superadmin_required
def create_user():
    """Create a new user (superadmin only)"""
    data = request.get_json()
    
    # Check if required fields are provided
    required_fields = ['username', 'email', 'password', 'role']
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
    
    # Get role ID from role name
    role = Database.get_single_result(
        "SELECT role_id FROM roles WHERE role_name = %s",
        (data['role'],)
    )
    
    if not role:
        return jsonify({'message': 'Invalid role'}), 400
    
    # Hash password
    hashed_password = hash_password(data['password'])
    
    try:
        # Insert user into database
        user_id = Database.execute_query(
            """
            INSERT INTO users (username, email, password, role_id)
            VALUES (%s, %s, %s, %s)
            """,
            (data['username'], data['email'], hashed_password, role['role_id']),
            fetch=False
        )
        
        # Log audit
        Database.execute_query(
            """
            INSERT INTO audit_log (user_id, action, details, ip_address)
            VALUES (%s, %s, %s, %s)
            """,
            (
                request.user['user_id'],
                'create_user',
                f"User created: {data['username']} with role {data['role']}",
                request.remote_addr
            ),
            fetch=False
        )
        
        return jsonify({
            'message': 'User created successfully',
            'user_id': user_id
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        return jsonify({'message': 'Error creating user'}), 500

@users_bp.route('/<int:user_id>', methods=['PUT'])
@token_required
def update_user(user_id):
    """Update a user"""
    data = request.get_json()
    
    # Check permissions (only superadmin, admin, or the user themselves)
    if request.user['user_id'] != user_id and request.user['role'] not in ['admin', 'superadmin']:
        return jsonify({'message': 'Unauthorized to update this user'}), 403
    
    # Only superadmin can update roles
    if 'role' in data and request.user['role'] != 'superadmin':
        return jsonify({'message': 'Only superadmin can update roles'}), 403
    
    try:
        # Build update query dynamically based on provided fields
        update_fields = []
        params = []
        
        if 'username' in data:
            # Check if username already exists
            existing_user = Database.get_single_result(
                "SELECT user_id FROM users WHERE username = %s AND user_id != %s",
                (data['username'], user_id)
            )
            
            if existing_user:
                return jsonify({'message': 'Username already exists'}), 409
                
            update_fields.append("username = %s")
            params.append(data['username'])
        
        if 'email' in data:
            # Check if email already exists
            existing_user = Database.get_single_result(
                "SELECT user_id FROM users WHERE email = %s AND user_id != %s",
                (data['email'], user_id)
            )
            
            if existing_user:
                return jsonify({'message': 'Email already exists'}), 409
                
            update_fields.append("email = %s")
            params.append(data['email'])
        
        if 'password' in data:
            hashed_password = hash_password(data['password'])
            update_fields.append("password = %s")
            params.append(hashed_password)
        
        if 'is_active' in data:
            update_fields.append("is_active = %s")
            params.append(data['is_active'])
        
        if 'role' in data:
            # Get role ID
            role = Database.get_single_result(
                "SELECT role_id FROM roles WHERE role_name = %s",
                (data['role'],)
            )
            
            if not role:
                return jsonify({'message': 'Invalid role'}), 400
                
            update_fields.append("role_id = %s")
            params.append(role['role_id'])
        
        if not update_fields:
            return jsonify({'message': 'No fields to update'}), 400
        
        # Add user_id to params
        params.append(user_id)
        
        # Execute update query
        Database.execute_query(
            f"""
            UPDATE users
            SET {', '.join(update_fields)}
            WHERE user_id = %s
            """,
            tuple(params),
            fetch=False
        )
        
        # Log audit
        Database.execute_query(
            """
            INSERT INTO audit_log (user_id, action, details, ip_address)
            VALUES (%s, %s, %s, %s)
            """,
            (
                request.user['user_id'],
                'update_user',
                f"User updated: ID {user_id}",
                request.remote_addr
            ),
            fetch=False
        )
        
        return jsonify({'message': 'User updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        return jsonify({'message': 'Error updating user'}), 500

@users_bp.route('/<int:user_id>', methods=['DELETE'])
@token_required
@superadmin_required
def delete_user(user_id):
    """Delete a user (superadmin only)"""
    try:
        # Check if user exists
        user = Database.get_single_result(
            "SELECT username FROM users WHERE user_id = %s",
            (user_id,)
        )
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Can't delete superadmin
        is_superadmin = Database.get_single_result(
            """
            SELECT u.user_id
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            WHERE u.user_id = %s AND r.role_name = 'superadmin'
            """,
            (user_id,)
        )
        
        if is_superadmin:
            return jsonify({'message': 'Cannot delete superadmin account'}), 403
        
        # Delete user
        Database.execute_query(
            "DELETE FROM users WHERE user_id = %s",
            (user_id,),
            fetch=False
        )
        
        # Log audit
        Database.execute_query(
            """
            INSERT INTO audit_log (user_id, action, details, ip_address)
            VALUES (%s, %s, %s, %s)
            """,
            (
                request.user['user_id'],
                'delete_user',
                f"User deleted: {user['username']}",
                request.remote_addr
            ),
            fetch=False
        )
        
        return jsonify({'message': 'User deleted successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        return jsonify({'message': 'Error deleting user'}), 500 