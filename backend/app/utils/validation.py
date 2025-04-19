import re
import logging
from marshmallow import Schema, fields, validate, ValidationError

# Configure logging
logger = logging.getLogger(__name__)

# Common validation patterns
USERNAME_PATTERN = r'^[a-zA-Z0-9_-]{3,20}$'
EMAIL_PATTERN = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'

class LoginSchema(Schema):
    """Schema for login data validation"""
    username = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    password = fields.Str(required=True, validate=validate.Length(min=1))

class RegisterSchema(Schema):
    """Schema for user registration data validation"""
    username = fields.Str(
        required=True, 
        validate=[
            validate.Length(min=3, max=20),
            validate.Regexp(USERNAME_PATTERN, error="Username must be 3-20 characters long and can only contain letters, numbers, underscores, and hyphens")
        ]
    )
    email = fields.Email(
        required=True,
        validate=validate.Regexp(EMAIL_PATTERN, error="Invalid email format")
    )
    password = fields.Str(
        required=True,
        validate=validate.Length(min=8, error="Password must be at least 8 characters long")
    )
    confirm_password = fields.Str(required=False)

    def validate_password_match(self, data):
        """Validate that password and confirm_password match"""
        if 'confirm_password' in data and data['password'] != data['confirm_password']:
            raise ValidationError("Passwords do not match", field_name="confirm_password")
        return data

class UserUpdateSchema(Schema):
    """Schema for user update data validation"""
    username = fields.Str(
        required=False,
        validate=[
            validate.Length(min=3, max=20),
            validate.Regexp(USERNAME_PATTERN, error="Username must be 3-20 characters long and can only contain letters, numbers, underscores, and hyphens")
        ]
    )
    email = fields.Email(required=False)
    role = fields.Str(required=False, validate=validate.OneOf(['user', 'admin', 'superadmin']))
    is_active = fields.Bool(required=False)
    new_password = fields.Str(required=False, validate=validate.Length(min=8))
    confirm_password = fields.Str(required=False)
    
    def validate_password_match(self, data):
        """Validate that new_password and confirm_password match"""
        if 'new_password' in data and 'confirm_password' in data:
            if data['new_password'] != data['confirm_password']:
                raise ValidationError("Passwords do not match", field_name="confirm_password")
        return data

class SubscriptionSchema(Schema):
    """Schema for subscription data validation"""
    plan_id = fields.Int(required=True, validate=validate.Range(min=1))

class AccessCodeSchema(Schema):
    """Schema for access code validation"""
    code = fields.Str(required=True, validate=validate.Length(min=10))

class PasswordResetRequestSchema(Schema):
    """Schema for password reset request validation"""
    email = fields.Email(required=True)

class PasswordResetSchema(Schema):
    """Schema for password reset validation"""
    token = fields.Str(required=True)
    new_password = fields.Str(required=True, validate=validate.Length(min=8))
    confirm_password = fields.Str(required=True)
    
    def validate_password_match(self, data):
        """Validate that new_password and confirm_password match"""
        if data['new_password'] != data['confirm_password']:
            raise ValidationError("Passwords do not match", field_name="confirm_password")
        return data

def validate_input(data, schema_class):
    """
    Validate input data against a schema
    
    Args:
        data (dict): Input data to validate
        schema_class (Schema): Schema class to use for validation
        
    Returns:
        dict: {
            'valid': bool,
            'data': dict of validated data (if valid),
            'errors': dict of validation errors (if invalid)
        }
    """
    try:
        # Create schema instance
        schema = schema_class()
        
        # Validate data
        validated_data = schema.load(data)
        
        # Check for custom validations
        if hasattr(schema, 'validate_password_match'):
            validated_data = schema.validate_password_match(validated_data)
        
        return {
            'valid': True,
            'data': validated_data,
            'errors': {}
        }
    except ValidationError as err:
        return {
            'valid': False,
            'data': {},
            'errors': err.messages
        }
    except Exception as e:
        logger.error(f"Validation error: {e}")
        return {
            'valid': False,
            'data': {},
            'errors': {'_error': str(e)}
        } 