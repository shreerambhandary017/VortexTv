import random
import string
import secrets
import time
from app.utils.database import Database
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AccessCodeGenerator: 
    @staticmethod
    def generate_code(length=16):
        #secrets module for random generation
        chars = string.ascii_uppercase + string.ascii_lowercase + string.digits
        code = ''.join(secrets.choice(chars) for _ in range(length))
        
        #timestamp to ensure uniqueness
        timestamp = str(int(time.time()))
        
        # random code with the timestamp
        combined_code = code + timestamp
        
        # Shuffle the combined code
        combined_list = list(combined_code)
        random.shuffle(combined_list)
        final_code = ''.join(combined_list)
        
        return final_code[:length]
    
    @staticmethod
    def generate_unique_code(length=16, max_attempts=3):
        for _ in range(max_attempts):
            code = AccessCodeGenerator.generate_code(length)
            
            # Check if code exists in database
            existing_code = Database.get_single_result(
                "SELECT code_id FROM access_codes WHERE code = %s",
                (code,)
            )
            
            if not existing_code:
                return code
        
        # If we reached max attempts, generate a longer code
        return AccessCodeGenerator.generate_unique_code(length + 2, max_attempts)
    
    @staticmethod
    def generate_formatted_code(length=16, separator='-', segment_length=4):
        code = AccessCodeGenerator.generate_unique_code(length)
        
        segments = []
        for i in range(0, len(code), segment_length):
            segments.append(code[i:i+segment_length])
        
        return separator.join(segments)
        
    @staticmethod
    def validate_code(code):
        # Remove any separators that might be in the code
        clean_code = code.replace('-', '').replace(' ', '')
        
        # Check if code exists
        access_code = Database.get_single_result(
            """
            SELECT code_id, created_by, used_by, is_active, expires_at
            FROM access_codes
            WHERE code = %s
            """,
            (clean_code,)
        )
        
        if not access_code:
            return (False, "Invalid access code")
        
        # Check if code is already used
        if access_code['used_by'] is not None:
            return (False, "Access code has already been used")
        
        # Check if code is active
        if not access_code['is_active']:
            return (False, "Access code is no longer active")
        
        # Check if code is expired
        from datetime import datetime
        if datetime.now() > access_code['expires_at']:
            return (False, "Access code has expired")
        
        return (True, None) 