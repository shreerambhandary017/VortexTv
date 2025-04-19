import os
import sys
import logging
from datetime import datetime

# Add the parent directory to sys.path to ensure proper module imports
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from app.utils.database import Database
from app import create_app

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migration():
    """Add failed_login_attempts and related columns to users table"""
    
    # Create Flask app to initialize database connection
    app = create_app('development')
    with app.app_context():
        try:
            # Check if columns already exist
            columns_exist = False
            try:
                Database.get_single_result(
                    """
                    SELECT failed_login_attempts 
                    FROM users 
                    LIMIT 1
                    """
                )
                columns_exist = True
                logger.info("Columns already exist in the database schema.")
            except Exception:
                # Column doesn't exist, proceed with migration
                pass
                
            if not columns_exist:
                # Add the missing columns
                logger.info("Adding login attempt tracking columns to users table...")
                
                # Add failed_login_attempts column
                Database.execute_query(
                    """
                    ALTER TABLE users 
                    ADD COLUMN failed_login_attempts INT DEFAULT 0,
                    ADD COLUMN last_failed_login DATETIME NULL,
                    ADD COLUMN last_login DATETIME NULL,
                    ADD COLUMN password_reset_at DATETIME NULL,
                    ADD COLUMN last_password_reset_ip VARCHAR(45) NULL;
                    """,
                    fetch=False
                )
                
                logger.info("Migration completed successfully!")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            return False

if __name__ == "__main__":
    if run_migration():
        print("Migration successful!")
    else:
        print("Migration not needed or failed. Check logs for details.") 