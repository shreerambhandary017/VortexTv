from flask import Blueprint, request, jsonify
from app.utils.database import Database
from app.utils.auth import token_required
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
profiles_bp = Blueprint('profiles', __name__)

@profiles_bp.route('', methods=['GET'])
@token_required
def get_user_profiles():
    """Get all profiles for the current user"""
    user_id = request.user['user_id']
    
    try:
        profiles = Database.execute_query(
            """
            SELECT profile_id, profile_name, avatar, is_kids_profile, created_at
            FROM user_profiles
            WHERE user_id = %s
            ORDER BY created_at ASC
            """,
            (user_id,)
        )
        
        return jsonify(profiles), 200
        
    except Exception as e:
        logger.error(f"Error getting user profiles: {e}")
        return jsonify({'message': 'Error getting user profiles'}), 500

@profiles_bp.route('/<int:profile_id>', methods=['GET'])
@token_required
def get_profile(profile_id):
    """Get a specific profile"""
    user_id = request.user['user_id']
    
    try:
        profile = Database.get_single_result(
            """
            SELECT profile_id, profile_name, avatar, is_kids_profile, created_at
            FROM user_profiles
            WHERE profile_id = %s AND user_id = %s
            """,
            (profile_id, user_id)
        )
        
        if not profile:
            return jsonify({'message': 'Profile not found'}), 404
        
        return jsonify(profile), 200
        
    except Exception as e:
        logger.error(f"Error getting profile: {e}")
        return jsonify({'message': 'Error getting profile'}), 500

@profiles_bp.route('', methods=['POST'])
@token_required
def create_profile():
    """Create a new profile for the current user"""
    data = request.get_json()
    user_id = request.user['user_id']
    
    # Check required fields
    if 'profile_name' not in data:
        return jsonify({'message': 'Missing profile_name'}), 400
    
    profile_name = data['profile_name']
    avatar = data.get('avatar', 'default.png')
    is_kids_profile = data.get('is_kids_profile', False)
    
    try:
        # Check if user already has maximum number of profiles (limit to 5)
        profile_count = Database.get_single_result(
            """
            SELECT COUNT(*) as count
            FROM user_profiles
            WHERE user_id = %s
            """,
            (user_id,)
        )
        
        if profile_count and profile_count['count'] >= 5:
            return jsonify({'message': 'Maximum number of profiles reached (5)'}), 403
        
        # Check if profile name already exists for this user
        existing_profile = Database.get_single_result(
            """
            SELECT profile_id
            FROM user_profiles
            WHERE user_id = %s AND profile_name = %s
            """,
            (user_id, profile_name)
        )
        
        if existing_profile:
            return jsonify({'message': 'Profile name already exists'}), 409
        
        # Create new profile
        profile_id = Database.execute_query(
            """
            INSERT INTO user_profiles (user_id, profile_name, avatar, is_kids_profile)
            VALUES (%s, %s, %s, %s)
            """,
            (user_id, profile_name, avatar, is_kids_profile),
            fetch=False
        )
        
        return jsonify({
            'message': 'Profile created successfully',
            'profile_id': profile_id,
            'profile_name': profile_name,
            'avatar': avatar,
            'is_kids_profile': is_kids_profile
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating profile: {e}")
        return jsonify({'message': 'Error creating profile'}), 500

@profiles_bp.route('/<int:profile_id>', methods=['PUT'])
@token_required
def update_profile(profile_id):
    """Update a profile"""
    data = request.get_json()
    user_id = request.user['user_id']
    
    try:
        # Check if profile exists and belongs to the user
        existing_profile = Database.get_single_result(
            """
            SELECT profile_id
            FROM user_profiles
            WHERE profile_id = %s AND user_id = %s
            """,
            (profile_id, user_id)
        )
        
        if not existing_profile:
            return jsonify({'message': 'Profile not found or unauthorized'}), 404
        
        # Build update query based on provided fields
        update_fields = []
        params = []
        
        if 'profile_name' in data:
            # Check if name already exists
            name_exists = Database.get_single_result(
                """
                SELECT profile_id
                FROM user_profiles
                WHERE user_id = %s AND profile_name = %s AND profile_id != %s
                """,
                (user_id, data['profile_name'], profile_id)
            )
            
            if name_exists:
                return jsonify({'message': 'Profile name already exists'}), 409
                
            update_fields.append("profile_name = %s")
            params.append(data['profile_name'])
        
        if 'avatar' in data:
            update_fields.append("avatar = %s")
            params.append(data['avatar'])
        
        if 'is_kids_profile' in data:
            update_fields.append("is_kids_profile = %s")
            params.append(data['is_kids_profile'])
        
        if not update_fields:
            return jsonify({'message': 'No fields to update'}), 400
        
        # Add profile_id to params
        params.append(profile_id)
        
        # Execute update
        Database.execute_query(
            f"""
            UPDATE user_profiles
            SET {', '.join(update_fields)}
            WHERE profile_id = %s
            """,
            tuple(params),
            fetch=False
        )
        
        return jsonify({'message': 'Profile updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        return jsonify({'message': 'Error updating profile'}), 500

@profiles_bp.route('/<int:profile_id>', methods=['DELETE'])
@token_required
def delete_profile(profile_id):
    """Delete a profile"""
    user_id = request.user['user_id']
    
    try:
        # Check if profile exists and belongs to the user
        existing_profile = Database.get_single_result(
            """
            SELECT profile_id
            FROM user_profiles
            WHERE profile_id = %s AND user_id = %s
            """,
            (profile_id, user_id)
        )
        
        if not existing_profile:
            return jsonify({'message': 'Profile not found or unauthorized'}), 404
        
        # Delete profile
        Database.execute_query(
            """
            DELETE FROM user_profiles
            WHERE profile_id = %s
            """,
            (profile_id,),
            fetch=False
        )
        
        return jsonify({'message': 'Profile deleted successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error deleting profile: {e}")
        return jsonify({'message': 'Error deleting profile'}), 500 