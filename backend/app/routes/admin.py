from flask import Blueprint, request, jsonify
from app.utils.database import Database
from app.utils.auth import token_required, admin_required, superadmin_required
from app.utils.tmdb import TMDBApi
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/stats', methods=['GET'])
@token_required
@admin_required
def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        # Get user stats
        user_stats = Database.get_single_result(
            """
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN role_id = 1 THEN 1 ELSE 0 END) as superadmin_count,
                SUM(CASE WHEN role_id = 2 THEN 1 ELSE 0 END) as admin_count,
                SUM(CASE WHEN role_id = 3 THEN 1 ELSE 0 END) as user_count,
                COUNT(DISTINCT CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN user_id END) as active_users_last_week
            FROM users
            """
        )
        
        # Get subscription stats
        subscription_stats = Database.get_single_result(
            """
            SELECT 
                COUNT(*) as total_subscriptions,
                SUM(CASE WHEN is_active = TRUE AND end_date > NOW() THEN 1 ELSE 0 END) as active_subscriptions,
                COUNT(DISTINCT user_id) as users_with_subscription
            FROM subscriptions
            """
        )
        
        # Get subscription plan distribution
        subscription_plans = Database.execute_query(
            """
            SELECT 
                p.plan_name,
                COUNT(*) as count,
                ROUND(SUM(p.price), 2) as total_revenue
            FROM subscriptions s
            JOIN subscription_plans p ON s.plan_id = p.plan_id
            WHERE s.is_active = TRUE AND s.end_date > NOW()
            GROUP BY p.plan_id, p.plan_name
            ORDER BY count DESC
            """
        )
        
        # Get access code stats
        access_code_stats = Database.get_single_result(
            """
            SELECT 
                COUNT(*) as total_codes,
                SUM(CASE WHEN used_by IS NOT NULL THEN 1 ELSE 0 END) as used_codes,
                SUM(CASE WHEN used_by IS NULL AND is_active = TRUE AND expires_at > NOW() THEN 1 ELSE 0 END) as available_codes
            FROM access_codes
            """
        )
        
        # Get recent user registrations (last 30 days)
        recent_registrations = Database.execute_query(
            """
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM users
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            """
        )
        
        # Compile all stats
        stats = {
            'user_stats': user_stats,
            'subscription_stats': subscription_stats,
            'subscription_plans': subscription_plans,
            'access_code_stats': access_code_stats,
            'recent_registrations': recent_registrations
        }
        
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error(f"Error getting admin stats: {e}")
        return jsonify({'message': 'Error getting dashboard statistics'}), 500

@admin_bp.route('/users', methods=['GET'])
@token_required
@admin_required
def get_users_with_roles():
    """Get all users with their roles"""
    try:
        # Get query parameters for pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        role_filter = request.args.get('role')
        search = request.args.get('search')
        
        offset = (page - 1) * per_page
        
        # Build query based on filters
        query = """
            SELECT u.user_id, u.username, u.email, r.role_name as role,
                  u.created_at, u.last_login, u.is_active
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            WHERE 1=1
        """
        params = []
        
        if role_filter:
            query += " AND r.role_name = %s"
            params.append(role_filter)
        
        if search:
            query += " AND (u.username LIKE %s OR u.email LIKE %s)"
            params.append(f"%{search}%")
            params.append(f"%{search}%")
        
        # Add ordering and pagination
        query += " ORDER BY u.created_at DESC LIMIT %s OFFSET %s"
        params.extend([per_page, offset])
        
        # Execute query
        users = Database.execute_query(query, tuple(params))
        
        # Get total count for pagination
        count_query = """
            SELECT COUNT(*) as count
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            WHERE 1=1
        """
        count_params = []
        
        if role_filter:
            count_query += " AND r.role_name = %s"
            count_params.append(role_filter)
        
        if search:
            count_query += " AND (u.username LIKE %s OR u.email LIKE %s)"
            count_params.append(f"%{search}%")
            count_params.append(f"%{search}%")
        
        count = Database.get_single_result(count_query, tuple(count_params) if count_params else None)
        
        return jsonify({
            'users': users,
            'total': count['count'] if count else 0,
            'page': page,
            'per_page': per_page,
            'pages': (count['count'] // per_page) + (1 if count['count'] % per_page > 0 else 0) if count else 0
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting users with roles: {e}")
        return jsonify({'message': 'Error getting users'}), 500

@admin_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@token_required
@superadmin_required
def update_user_role(user_id):
    """Update a user's role (superadmin only)"""
    data = request.get_json()
    
    if 'role' not in data:
        return jsonify({'message': 'Missing role'}), 400
    
    role = data['role']
    
    try:
        # Get role_id from role name
        role_data = Database.get_single_result(
            "SELECT role_id FROM roles WHERE role_name = %s",
            (role,)
        )
        
        if not role_data:
            return jsonify({'message': 'Invalid role'}), 400
        
        role_id = role_data['role_id']
        
        # Check if user exists
        user = Database.get_single_result(
            "SELECT username FROM users WHERE user_id = %s",
            (user_id,)
        )
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Check if user is the only superadmin
        if role != 'superadmin':
            is_only_superadmin = Database.get_single_result(
                """
                SELECT (
                    SELECT COUNT(*) FROM users u
                    JOIN roles r ON u.role_id = r.role_id
                    WHERE r.role_name = 'superadmin'
                ) = 1 AND (
                    SELECT r.role_name FROM users u
                    JOIN roles r ON u.role_id = r.role_id
                    WHERE u.user_id = %s
                ) = 'superadmin' as is_only
                """,
                (user_id,)
            )
            
            if is_only_superadmin and is_only_superadmin['is_only'] == 1:
                return jsonify({'message': 'Cannot change role of the only superadmin'}), 403
        
        # Update user role
        Database.execute_query(
            "UPDATE users SET role_id = %s WHERE user_id = %s",
            (role_id, user_id),
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
                'update_user_role',
                f"Updated role of user {user['username']} to {role}",
                request.remote_addr
            ),
            fetch=False
        )
        
        return jsonify({'message': 'User role updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error updating user role: {e}")
        return jsonify({'message': 'Error updating user role'}), 500

@admin_bp.route('/users/<int:user_id>/password', methods=['PUT'])
@token_required
@superadmin_required
def admin_reset_user_password(user_id):
    """Reset a user's password (superadmin only)"""
    from app.utils.auth import hash_password
    
    data = request.get_json()
    
    if 'new_password' not in data:
        return jsonify({'message': 'Missing new password'}), 400
    
    new_password = data['new_password']
    
    # Check if new password is at least 8 characters
    if len(new_password) < 8:
        return jsonify({'message': 'New password must be at least 8 characters'}), 400
    
    try:
        # Check if user exists
        user = Database.get_single_result(
            "SELECT username FROM users WHERE user_id = %s",
            (user_id,)
        )
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Hash new password
        hashed_password = hash_password(new_password)
        
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
                request.user['user_id'],
                'admin_reset_password',
                f"Reset password for user {user['username']}",
                request.remote_addr
            ),
            fetch=False
        )
        
        return jsonify({'message': 'Password reset successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error resetting user password: {e}")
        return jsonify({'message': 'Error resetting user password'}), 500

@admin_bp.route('/subscriptions', methods=['GET'])
@token_required
@admin_required
def get_all_subscriptions():
    """Get all subscriptions with user details"""
    try:
        # Get query parameters for pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        status = request.args.get('status')  # active, expired, all
        search = request.args.get('search')
        
        offset = (page - 1) * per_page
        
        # Build query based on filters
        query = """
            SELECT s.subscription_id, s.user_id, u.username, u.email,
                   p.plan_name, s.start_date, s.end_date, s.is_active, s.payment_status
            FROM subscriptions s
            JOIN users u ON s.user_id = u.user_id
            JOIN subscription_plans p ON s.plan_id = p.plan_id
            WHERE 1=1
        """
        params = []
        
        if status == 'active':
            query += " AND s.is_active = TRUE AND s.end_date > NOW()"
        elif status == 'expired':
            query += " AND (s.is_active = FALSE OR s.end_date <= NOW())"
        
        if search:
            query += " AND (u.username LIKE %s OR u.email LIKE %s)"
            params.append(f"%{search}%")
            params.append(f"%{search}%")
        
        # Add ordering and pagination
        query += " ORDER BY s.start_date DESC LIMIT %s OFFSET %s"
        params.extend([per_page, offset])
        
        # Execute query
        subscriptions = Database.execute_query(query, tuple(params) if params else None)
        
        # Get total count for pagination
        count_query = """
            SELECT COUNT(*) as count
            FROM subscriptions s
            JOIN users u ON s.user_id = u.user_id
            JOIN subscription_plans p ON s.plan_id = p.plan_id
            WHERE 1=1
        """
        count_params = []
        
        if status == 'active':
            count_query += " AND s.is_active = TRUE AND s.end_date > NOW()"
        elif status == 'expired':
            count_query += " AND (s.is_active = FALSE OR s.end_date <= NOW())"
        
        if search:
            count_query += " AND (u.username LIKE %s OR u.email LIKE %s)"
            count_params.append(f"%{search}%")
            count_params.append(f"%{search}%")
        
        count = Database.get_single_result(count_query, tuple(count_params) if count_params else None)
        
        return jsonify({
            'subscriptions': subscriptions,
            'total': count['count'] if count else 0,
            'page': page,
            'per_page': per_page,
            'pages': (count['count'] // per_page) + (1 if count['count'] % per_page > 0 else 0) if count else 0
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting all subscriptions: {e}")
        return jsonify({'message': 'Error getting subscriptions'}), 500

@admin_bp.route('/audit-logs', methods=['GET'])
@token_required
@admin_required
def get_audit_logs():
    """Get audit logs"""
    try:
        # Get query parameters for pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        action_filter = request.args.get('action')
        user_id_filter = request.args.get('user_id')
        
        offset = (page - 1) * per_page
        
        # Build query based on filters
        query = """
            SELECT l.log_id, l.user_id, u.username, l.action, l.details, 
                   l.ip_address, l.created_at
            FROM audit_log l
            LEFT JOIN users u ON l.user_id = u.user_id
            WHERE 1=1
        """
        params = []
        
        if action_filter:
            query += " AND l.action = %s"
            params.append(action_filter)
        
        if user_id_filter:
            query += " AND l.user_id = %s"
            params.append(int(user_id_filter))
        
        # Add ordering and pagination
        query += " ORDER BY l.created_at DESC LIMIT %s OFFSET %s"
        params.extend([per_page, offset])
        
        # Execute query
        logs = Database.execute_query(query, tuple(params) if params else None)
        
        # Get total count for pagination
        count_query = """
            SELECT COUNT(*) as count
            FROM audit_log l
            WHERE 1=1
        """
        count_params = []
        
        if action_filter:
            count_query += " AND l.action = %s"
            count_params.append(action_filter)
        
        if user_id_filter:
            count_query += " AND l.user_id = %s"
            count_params.append(int(user_id_filter))
        
        count = Database.get_single_result(count_query, tuple(count_params) if count_params else None)
        
        return jsonify({
            'logs': logs,
            'total': count['count'] if count else 0,
            'page': page,
            'per_page': per_page,
            'pages': (count['count'] // per_page) + (1 if count['count'] % per_page > 0 else 0) if count else 0
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting audit logs: {e}")
        return jsonify({'message': 'Error getting audit logs'}), 500

@admin_bp.route('/movies', methods=['GET'])
@token_required
@admin_required
def admin_get_movies():
    """Get movies with pagination for admin panel"""
    try:
        # Get query parameters for pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        
        # Fetch movies from TMDB
        if search:
            response = TMDBApi.search_movies(search, page)
        else:
            response = TMDBApi.get_popular_movies(page)
            
        if 'error' in response:
            return jsonify({'message': response['error']}), 500
            
        # Format response to match expected format
        return jsonify({
            'items': response.get('results', []),
            'total': response.get('total_results', 0),
            'page': page,
            'per_page': per_page,
            'pages': response.get('total_pages', 0)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting movies for admin: {e}")
        return jsonify({'message': 'Error getting movies'}), 500

@admin_bp.route('/tv', methods=['GET'])
@token_required
@admin_required
def admin_get_tv_shows():
    """Get TV shows with pagination for admin panel"""
    try:
        # Get query parameters for pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        
        # Fetch TV shows from TMDB
        if search:
            response = TMDBApi.search_tv_shows(search, page)
        else:
            response = TMDBApi.get_popular_tv_shows(page)
            
        if 'error' in response:
            return jsonify({'message': response['error']}), 500
            
        # Format response to match expected format
        return jsonify({
            'items': response.get('results', []),
            'total': response.get('total_results', 0),
            'page': page,
            'per_page': per_page,
            'pages': response.get('total_pages', 0)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting TV shows for admin: {e}")
        return jsonify({'message': 'Error getting TV shows'}), 500 