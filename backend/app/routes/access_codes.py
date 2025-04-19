from flask import Blueprint, request, jsonify
from app.utils.database import Database
from app.utils.auth import token_required
from app.utils.access_code import AccessCodeGenerator
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
access_codes_bp = Blueprint('access_codes', __name__)

@access_codes_bp.route('/generate', methods=['POST'])
@token_required
def generate_access_code():
    """Generate a new access code for the current user's subscription"""
    user_id = request.user['user_id']
    
    try:
        # Check if user has active subscription
        subscription = Database.get_single_result(
            """
            SELECT s.subscription_id, s.end_date, p.max_access_codes, p.plan_name
            FROM subscriptions s
            JOIN subscription_plans p ON s.plan_id = p.plan_id
            WHERE s.user_id = %s AND s.is_active = TRUE AND s.end_date > NOW()
            """,
            (user_id,)
        )
        
        if not subscription:
            return jsonify({'success': False, 'error': 'No active subscription found'}), 403
        
        # Check if user has reached the max number of access codes
        codes_count = Database.get_single_result(
            """
            SELECT COUNT(*) as count
            FROM access_codes
            WHERE created_by = %s AND subscription_id = %s
            """,
            (user_id, subscription['subscription_id'])
        )
        
        if codes_count and codes_count['count'] >= subscription['max_access_codes']:
            return jsonify({
                'success': False,
                'error': 'Maximum number of access codes reached for your subscription plan',
                'max_codes': subscription['max_access_codes'],
                'current_count': codes_count['count']
            }), 403
        
        # Generate a formatted access code
        access_code = AccessCodeGenerator.generate_formatted_code()
        
        # Insert access code into database
        code_id = Database.execute_query(
            """
            INSERT INTO access_codes (code, created_by, subscription_id, expires_at, is_active)
            VALUES (%s, %s, %s, %s, TRUE)
            RETURNING code_id
            """,
            (
                access_code.replace('-', ''),  # Store without separators
                user_id,
                subscription['subscription_id'],
                subscription['end_date']
            )
        )
        
        if code_id and len(code_id) > 0:
            code_id = code_id[0]['code_id']
        
        # Log audit
        Database.execute_query(
            """
            INSERT INTO audit_log (user_id, action, details, ip_address)
            VALUES (%s, %s, %s, %s)
            """,
            (
                user_id,
                'generate_access_code',
                f"Access code generated for subscription {subscription['subscription_id']}",
                request.remote_addr
            ),
            fetch=False
        )
        
        # Calculate remaining codes
        current_count = codes_count['count'] + 1 if codes_count else 1
        remaining_codes = max(0, subscription['max_access_codes'] - current_count)
        
        return jsonify({
            'success': True,
            'message': 'Access code generated successfully',
            'code': access_code,
            'code_id': code_id,
            'expiryDate': subscription['end_date'].isoformat() if subscription['end_date'] else None,
            'planName': subscription['plan_name'],
            'remainingCodes': remaining_codes,
            'maxAllowedCodes': subscription['max_access_codes'],
            'generatedCodes': current_count
        }), 201
        
    except Exception as e:
        logger.error(f"Error generating access code: {e}")
        return jsonify({'success': False, 'error': 'Error generating access code'}), 500

@access_codes_bp.route('/redeem', methods=['POST'])
@token_required
def redeem_access_code():
    """Redeem an access code"""
    data = request.get_json()
    user_id = request.user['user_id']
    
    # Check if code is provided
    if 'code' not in data:
        return jsonify({'success': False, 'error': 'Missing access code'}), 400
    
    # Clean code by removing separators
    clean_code = data['code'].replace('-', '').replace(' ', '')
    
    try:
        # Check if user already has an active subscription
        existing_subscription = Database.get_single_result(
            """
            SELECT subscription_id
            FROM subscriptions
            WHERE user_id = %s AND is_active = TRUE AND end_date > NOW()
            """,
            (user_id,)
        )
        
        if existing_subscription:
            return jsonify({'success': False, 'error': 'You already have an active subscription'}), 400
        
        # Check if user already has a redeemed access code
        existing_code = Database.get_single_result(
            """
            SELECT code_id
            FROM access_codes
            WHERE used_by = %s AND is_active = TRUE AND expires_at > NOW()
            """,
            (user_id,)
        )
        
        if existing_code:
            return jsonify({'success': False, 'error': 'You already have an active access code'}), 400
        
        # Check if the access code is valid
        is_valid, error_message = AccessCodeGenerator.validate_code(clean_code)
        
        if not is_valid:
            return jsonify({'success': False, 'error': error_message}), 400
        
        # Get the access code
        access_code = Database.get_single_result(
            """
            SELECT ac.code_id, ac.code, ac.created_by, ac.subscription_id, ac.expires_at,
                   s.user_id as owner_id, u.username as owner_username
            FROM access_codes ac
            JOIN subscriptions s ON ac.subscription_id = s.subscription_id
            JOIN users u ON s.user_id = u.user_id
            WHERE ac.code = %s AND ac.is_active = TRUE AND ac.expires_at > NOW()
            """,
            (clean_code,)
        )
        
        if not access_code:
            return jsonify({'success': False, 'error': 'Invalid or expired access code'}), 400
        
        # Check if the owner is the same as the user trying to redeem
        if access_code['owner_id'] == user_id:
            return jsonify({'success': False, 'error': 'You cannot redeem your own access code'}), 400
        
        # Update the access code to mark it as used
        Database.execute_query(
            """
            UPDATE access_codes
            SET used_by = %s
            WHERE code_id = %s
            """,
            (user_id, access_code['code_id']),
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
                'redeem_access_code',
                f"Access code {clean_code} redeemed from user {access_code['owner_username']}",
                request.remote_addr
            ),
            fetch=False
        )
        
        # Get subscription plan details
        subscription_plan = Database.get_single_result(
            """
            SELECT p.plan_name, p.price, p.description
            FROM subscriptions s
            JOIN subscription_plans p ON s.plan_id = p.plan_id
            WHERE s.subscription_id = %s
            """,
            (access_code['subscription_id'],)
        )
        
        return jsonify({
            'success': True,
            'message': 'Access code redeemed successfully',
            'accessCodeDetails': {
                'code': clean_code,
                'code_id': access_code['code_id'],
                'expiryDate': access_code['expires_at'].isoformat() if access_code['expires_at'] else None,
                'ownerUsername': access_code['owner_username'],
                'ownerId': access_code['owner_id'],
                'planName': subscription_plan['plan_name'] if subscription_plan else 'Premium'
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error redeeming access code: {e}")
        return jsonify({'success': False, 'error': 'Error redeeming access code'}), 500

@access_codes_bp.route('/me', methods=['GET'])
@token_required
def get_user_access_codes():
    """Get all access codes created by the current user"""
    user_id = request.user['user_id']
    
    try:
        # Get all access codes created by the user
        access_codes = Database.execute_query(
            """
            SELECT ac.code_id, ac.code, ac.created_at, ac.expires_at, ac.is_active,
                  ac.used_by, u.username as used_by_username
            FROM access_codes ac
            LEFT JOIN users u ON ac.used_by = u.user_id
            WHERE ac.created_by = %s
            ORDER BY ac.created_at DESC
            """,
            (user_id,)
        )
        
        # Format codes for display
        for code in access_codes:
            # Format code with separators for better readability
            raw_code = code['code']
            formatted_code = '-'.join([raw_code[i:i+4] for i in range(0, len(raw_code), 4)])
            code['formatted_code'] = formatted_code
            
            # Add status info
            if not code['is_active']:
                code['status'] = 'Inactive'
            elif code['used_by'] is None:
                code['status'] = 'Available'
            else:
                code['status'] = 'Used'
            
            # Check if expired
            if code['expires_at'] < datetime.now():
                code['status'] = 'Expired'
        
        return jsonify(access_codes), 200
        
    except Exception as e:
        logger.error(f"Error getting user access codes: {e}")
        return jsonify({'message': 'Error getting access codes'}), 500

@access_codes_bp.route('/revoke/<int:code_id>', methods=['POST'])
@token_required
def revoke_access_code(code_id):
    """Revoke an access code"""
    user_id = request.user['user_id']
    
    try:
        # Check if the access code exists and was created by the user
        access_code = Database.get_single_result(
            """
            SELECT code_id, code, used_by
            FROM access_codes
            WHERE code_id = %s AND created_by = %s
            """,
            (code_id, user_id)
        )
        
        if not access_code:
            return jsonify({'message': 'Access code not found or you are not authorized to revoke it'}), 404
        
        # Update access code to mark it as inactive
        Database.execute_query(
            """
            UPDATE access_codes
            SET is_active = FALSE
            WHERE code_id = %s
            """,
            (code_id,),
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
                'revoke_access_code',
                f"Access code {access_code['code']} revoked",
                request.remote_addr
            ),
            fetch=False
        )
        
        return jsonify({'message': 'Access code revoked successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error revoking access code: {e}")
        return jsonify({'message': 'Error revoking access code'}), 500 