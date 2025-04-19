from flask import Blueprint, request, jsonify
from app.utils.database import Database
from app.utils.auth import token_required, admin_required
from datetime import datetime, timedelta
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
subscriptions_bp = Blueprint('subscriptions', __name__)

@subscriptions_bp.route('/plans', methods=['GET'])
def get_subscription_plans():
    """Get all subscription plans"""
    try:
        plans = Database.execute_query(
            """
            SELECT plan_id, plan_name, price, duration_months, max_access_codes,
                  description, features
            FROM subscription_plans
            ORDER BY price ASC
            """
        )
        
        # Parse features into array
        for plan in plans:
            if plan['features']:
                plan['features'] = plan['features'].split(';')
            else:
                plan['features'] = []
        
        return jsonify(plans), 200
        
    except Exception as e:
        logger.error(f"Error getting subscription plans: {e}")
        return jsonify({'message': 'Error getting subscription plans'}), 500

@subscriptions_bp.route('/check', methods=['GET'])
@token_required
def check_subscription():
    """Check if the current user has an active subscription or access code"""
    user_id = request.user['user_id']
    
    try:
        # Check for active subscription
        subscription = Database.get_single_result(
            """
            SELECT s.subscription_id, p.plan_id, p.plan_name, s.start_date, s.end_date,
                  p.max_access_codes, p.price, s.is_active as status,
                  p.description, p.features
            FROM subscriptions s
            JOIN subscription_plans p ON s.plan_id = p.plan_id
            WHERE s.user_id = %s AND s.is_active = TRUE AND s.end_date > NOW()
            """,
            (user_id,)
        )
        
        has_subscription = subscription is not None
        subscription_plan = None
        expiry_date = None
        generated_codes = 0
        max_allowed_codes = 0
        remaining_codes = 0
        
        if has_subscription:
            # Get subscription plan details
            subscription_plan = {
                'id': subscription['plan_id'],
                'name': subscription['plan_name'],
                'price': subscription['price'],
                'description': subscription['description'],
                'features': subscription['features'].split(';') if subscription['features'] else []
            }
            
            # Parse subscription expiry date
            expiry_date = subscription['end_date'].isoformat() if subscription['end_date'] else None
            
            # Get number of access codes generated for this subscription
            codes_count = Database.get_single_result(
                """
                SELECT COUNT(*) as count
                FROM access_codes
                WHERE created_by = %s AND subscription_id = %s
                """,
                (user_id, subscription['subscription_id'])
            )
            
            generated_codes = codes_count['count'] if codes_count else 0
            max_allowed_codes = subscription['max_access_codes'] or 0
            remaining_codes = max(0, max_allowed_codes - generated_codes)
        
        # Check for valid access code
        access_code = Database.get_single_result(
            """
            SELECT ac.code_id, ac.code, s.end_date as expires_at,
                  u.username as owner_username, u.user_id as owner_id
            FROM access_codes ac
            JOIN subscriptions s ON ac.subscription_id = s.subscription_id
            JOIN users u ON ac.created_by = u.user_id
            WHERE ac.used_by = %s AND ac.is_active = TRUE AND s.end_date > NOW()
            """,
            (user_id,)
        )
        
        has_access_code = access_code is not None
        access_code_details = None
        
        if has_access_code:
            # Structure access code details
            access_code_details = {
                'code_id': access_code['code_id'],
                'code': access_code['code'],
                'expiryDate': access_code['expires_at'].isoformat() if access_code['expires_at'] else None,
                'ownerUsername': access_code['owner_username'],
                'ownerId': access_code['owner_id']
            }
        
        return jsonify({
            'hasSubscription': has_subscription,
            'hasAccessCode': has_access_code,
            'subscriptionPlan': subscription_plan,
            'status': 'active' if has_subscription else ('shared' if has_access_code else 'inactive'),
            'expiryDate': expiry_date,
            'generatedCodes': generated_codes,
            'maxAllowedCodes': max_allowed_codes,
            'remainingCodes': remaining_codes,
            'accessCodeDetails': access_code_details
        }), 200
        
    except Exception as e:
        logger.error(f"Error checking subscription: {e}")
        return jsonify({'message': 'Error checking subscription status'}), 500

@subscriptions_bp.route('/me', methods=['GET'])
@token_required
def get_user_subscription():
    """Get the current user's subscription details"""
    user_id = request.user['user_id']
    
    try:
        # Get active subscription
        subscription = Database.get_single_result(
            """
            SELECT s.subscription_id, p.plan_id, p.plan_name, p.price,
                  s.start_date, s.end_date, s.is_active, s.payment_status,
                  p.max_access_codes, p.features, p.description
            FROM subscriptions s
            JOIN subscription_plans p ON s.plan_id = p.plan_id
            WHERE s.user_id = %s AND s.is_active = TRUE
            ORDER BY s.end_date DESC
            LIMIT 1
            """,
            (user_id,)
        )
        
        if not subscription:
            return jsonify({'message': 'No active subscription found'}), 404
        
        # Parse features
        if subscription['features']:
            subscription['features'] = subscription['features'].split(';')
        else:
            subscription['features'] = []
        
        # Get generated access codes for this subscription
        access_codes = Database.execute_query(
            """
            SELECT code_id, code, used_by, created_at, expires_at, is_active
            FROM access_codes
            WHERE created_by = %s AND subscription_id = %s
            """,
            (user_id, subscription['subscription_id'])
        )
        
        # Get usernames for used access codes
        for code in access_codes:
            if code['used_by']:
                user = Database.get_single_result(
                    "SELECT username FROM users WHERE user_id = %s",
                    (code['used_by'],)
                )
                if user:
                    code['used_by_username'] = user['username']
        
        subscription['access_codes'] = access_codes
        
        return jsonify(subscription), 200
        
    except Exception as e:
        logger.error(f"Error getting user subscription: {e}")
        return jsonify({'message': 'Error getting subscription details'}), 500

@subscriptions_bp.route('', methods=['POST'])
@token_required
def create_subscription():
    """Create a new subscription for the current user"""
    data = request.get_json()
    user_id = request.user['user_id']
    
    # Check if plan_id is provided
    if 'plan_id' not in data:
        return jsonify({'message': 'Missing plan_id'}), 400
    
    plan_id = data['plan_id']
    
    try:
        # Check if plan exists
        plan = Database.get_single_result(
            """
            SELECT plan_id, duration_months
            FROM subscription_plans
            WHERE plan_id = %s
            """,
            (plan_id,)
        )
        
        if not plan:
            return jsonify({'message': 'Subscription plan not found'}), 404
        
        # Calculate end date based on duration
        start_date = datetime.now()
        end_date = start_date + timedelta(days=30 * plan['duration_months'])
        
        # Deactivate any existing subscriptions
        Database.execute_query(
            """
            UPDATE subscriptions
            SET is_active = FALSE
            WHERE user_id = %s AND is_active = TRUE
            """,
            (user_id,),
            fetch=False
        )
        
        # Create new subscription
        subscription_id = Database.execute_query(
            """
            INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, is_active, payment_status)
            VALUES (%s, %s, %s, %s, TRUE, 'completed')
            """,
            (user_id, plan_id, start_date, end_date),
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
                'create_subscription',
                f"Subscription created for plan ID {plan_id}",
                request.remote_addr
            ),
            fetch=False
        )
        
        return jsonify({
            'message': 'Subscription created successfully',
            'subscription_id': subscription_id,
            'start_date': start_date,
            'end_date': end_date
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating subscription: {e}")
        return jsonify({'message': 'Error creating subscription'}), 500

@subscriptions_bp.route('/me', methods=['DELETE'])
@token_required
def cancel_subscription():
    """Cancel the current user's subscription"""
    user_id = request.user['user_id']
    
    try:
        # Check if user has active subscription
        subscription = Database.get_single_result(
            """
            SELECT subscription_id
            FROM subscriptions
            WHERE user_id = %s AND is_active = TRUE
            """,
            (user_id,)
        )
        
        if not subscription:
            return jsonify({'message': 'No active subscription found'}), 404
        
        # Deactivate subscription
        Database.execute_query(
            """
            UPDATE subscriptions
            SET is_active = FALSE
            WHERE subscription_id = %s
            """,
            (subscription['subscription_id'],),
            fetch=False
        )
        
        # Deactivate all access codes for this subscription
        Database.execute_query(
            """
            UPDATE access_codes
            SET is_active = FALSE
            WHERE subscription_id = %s
            """,
            (subscription['subscription_id'],),
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
                'cancel_subscription',
                f"Subscription {subscription['subscription_id']} cancelled",
                request.remote_addr
            ),
            fetch=False
        )
        
        return jsonify({'message': 'Subscription cancelled successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error cancelling subscription: {e}")
        return jsonify({'message': 'Error cancelling subscription'}), 500

# Admin routes

@subscriptions_bp.route('/all', methods=['GET'])
@token_required
@admin_required
def get_all_subscriptions():
    """Get all subscriptions (admin only)"""
    try:
        # Get query parameters for pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        offset = (page - 1) * per_page
        
        # Get subscriptions with pagination
        subscriptions = Database.execute_query(
            """
            SELECT s.subscription_id, s.user_id, u.username, u.email,
                  p.plan_name, s.start_date, s.end_date, s.is_active, s.payment_status
            FROM subscriptions s
            JOIN users u ON s.user_id = u.user_id
            JOIN subscription_plans p ON s.plan_id = p.plan_id
            ORDER BY s.start_date DESC
            LIMIT %s OFFSET %s
            """,
            (per_page, offset)
        )
        
        # Get total subscription count
        count = Database.get_single_result(
            "SELECT COUNT(*) as count FROM subscriptions"
        )
        
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

@subscriptions_bp.route('/plans', methods=['POST'])
@token_required
@admin_required
def create_subscription_plan():
    """Create a new subscription plan (admin only)"""
    data = request.get_json()
    
    # Check if required fields are provided
    required_fields = ['plan_name', 'price', 'duration_months', 'max_access_codes']
    for field in required_fields:
        if field not in data:
            return jsonify({'message': f'Missing required field: {field}'}), 400
    
    try:
        # Insert plan into database
        plan_id = Database.execute_query(
            """
            INSERT INTO subscription_plans (plan_name, price, duration_months, max_access_codes, description, features)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                data['plan_name'],
                data['price'],
                data['duration_months'],
                data['max_access_codes'],
                data.get('description', ''),
                data.get('features', '')
            ),
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
                'create_plan',
                f"Subscription plan created: {data['plan_name']}",
                request.remote_addr
            ),
            fetch=False
        )
        
        return jsonify({
            'message': 'Subscription plan created successfully',
            'plan_id': plan_id
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating subscription plan: {e}")
        return jsonify({'message': 'Error creating subscription plan'}), 500

@subscriptions_bp.route('/plans/<int:plan_id>', methods=['PUT'])
@token_required
@admin_required
def update_subscription_plan(plan_id):
    """Update a subscription plan (admin only)"""
    data = request.get_json()
    
    try:
        # Check if plan exists
        plan = Database.get_single_result(
            "SELECT plan_id FROM subscription_plans WHERE plan_id = %s",
            (plan_id,)
        )
        
        if not plan:
            return jsonify({'message': 'Subscription plan not found'}), 404
        
        # Build update query dynamically based on provided fields
        update_fields = []
        params = []
        
        if 'plan_name' in data:
            update_fields.append("plan_name = %s")
            params.append(data['plan_name'])
        
        if 'price' in data:
            update_fields.append("price = %s")
            params.append(data['price'])
        
        if 'duration_months' in data:
            update_fields.append("duration_months = %s")
            params.append(data['duration_months'])
        
        if 'max_access_codes' in data:
            update_fields.append("max_access_codes = %s")
            params.append(data['max_access_codes'])
        
        if 'description' in data:
            update_fields.append("description = %s")
            params.append(data['description'])
        
        if 'features' in data:
            update_fields.append("features = %s")
            params.append(data['features'])
        
        if not update_fields:
            return jsonify({'message': 'No fields to update'}), 400
        
        # Add plan_id to params
        params.append(plan_id)
        
        # Execute update query
        Database.execute_query(
            f"""
            UPDATE subscription_plans
            SET {', '.join(update_fields)}
            WHERE plan_id = %s
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
                'update_plan',
                f"Subscription plan updated: ID {plan_id}",
                request.remote_addr
            ),
            fetch=False
        )
        
        return jsonify({'message': 'Subscription plan updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error updating subscription plan: {e}")
        return jsonify({'message': 'Error updating subscription plan'}), 500

@subscriptions_bp.route('/plans/<int:plan_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_subscription_plan(plan_id):
    """Delete a subscription plan (admin only)"""
    try:
        # Check if plan exists
        plan = Database.get_single_result(
            "SELECT plan_id, plan_name FROM subscription_plans WHERE plan_id = %s",
            (plan_id,)
        )
        
        if not plan:
            return jsonify({'message': 'Subscription plan not found'}), 404
        
        # Check if plan is associated with any active subscriptions
        active_subscriptions = Database.get_single_result(
            """
            SELECT COUNT(*) as count 
            FROM subscriptions 
            WHERE plan_id = %s AND is_active = TRUE
            """,
            (plan_id,)
        )
        
        if active_subscriptions and active_subscriptions['count'] > 0:
            return jsonify({
                'message': 'Cannot delete plan with active subscriptions',
                'active_subscriptions': active_subscriptions['count']
            }), 400
        
        # Delete the plan
        Database.execute_query(
            "DELETE FROM subscription_plans WHERE plan_id = %s",
            (plan_id,),
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
                'delete_plan',
                f"Subscription plan deleted: {plan['plan_name']} (ID: {plan_id})",
                request.remote_addr
            ),
            fetch=False
        )
        
        return jsonify({'message': 'Subscription plan deleted successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error deleting subscription plan: {e}")
        return jsonify({'message': 'Error deleting subscription plan'}), 500 