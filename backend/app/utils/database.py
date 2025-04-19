import mysql.connector
from mysql.connector import Error
from app.config.config import active_config as config
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Database:
    """
    Database utility class for MySQL operations
    """
    
    @staticmethod
    def get_connection():
        """
        Creates and returns a connection to the database
        """
        try:
            connection = mysql.connector.connect(
                host=config.DB_HOST,
                database=config.DB_NAME,
                user=config.DB_USER,
                password=config.DB_PASSWORD,
                port=config.DB_PORT
            )
            
            if connection.is_connected():
                return connection
                
        except Error as e:
            logger.error(f"Error connecting to MySQL database: {e}")
            raise
    
    @staticmethod
    def execute_query(query, params=None, fetch=True):
        """
        Executes a query and returns the result
        
        Args:
            query (str): SQL query to execute
            params (tuple, optional): Parameters for the query
            fetch (bool): Whether to fetch results or not
            
        Returns:
            If fetch is True, returns the query result
            If fetch is False, returns the last row id
        """
        connection = None
        cursor = None
        result = None
        
        try:
            connection = Database.get_connection()
            cursor = connection.cursor(dictionary=True)
            
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
                
            if fetch:
                result = cursor.fetchall()
            else:
                connection.commit()
                result = cursor.lastrowid
                
            return result
            
        except Error as e:
            if connection:
                connection.rollback()
            logger.error(f"Error executing query: {e}")
            raise
            
        finally:
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()
    
    @staticmethod
    def execute_many(query, params_list):
        """
        Executes a query multiple times with different parameters
        
        Args:
            query (str): SQL query to execute
            params_list (list): List of parameter tuples
            
        Returns:
            int: Number of affected rows
        """
        connection = None
        cursor = None
        
        try:
            connection = Database.get_connection()
            cursor = connection.cursor()
            
            cursor.executemany(query, params_list)
            connection.commit()
            
            return cursor.rowcount
            
        except Error as e:
            if connection:
                connection.rollback()
            logger.error(f"Error executing many: {e}")
            raise
            
        finally:
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()
    
    @staticmethod
    def get_single_result(query, params=None):
        """
        Executes a query and returns a single result
        
        Args:
            query (str): SQL query to execute
            params (tuple, optional): Parameters for the query
            
        Returns:
            dict or None: First result row as a dictionary or None if no result
        """
        results = Database.execute_query(query, params)
        
        if results and len(results) > 0:
            return results[0]
        
        return None