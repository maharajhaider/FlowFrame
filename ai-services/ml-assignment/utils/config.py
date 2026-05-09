import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # API Configuration
    SERVICE_NAME = "ML Assignment Service"
    SERVICE_VERSION = "1.0.0"
    PORT = int(os.getenv('ML_SERVICE_PORT', 8001))
    HOST = os.getenv('ML_SERVICE_HOST', '0.0.0.0')
    
    # Node.js Backend Integration
    MERN_API_BASE_URL = os.getenv('MERN_API_BASE_URL', 'http://localhost:8000')
    
    # Database Configuration
    MONGODB_URI = os.getenv('MONGODB_URI')  # Must be set in environment
    
    # ML Model Configuration (for future steps)
    SENTENCE_TRANSFORMER_MODEL = os.getenv('ST_MODEL', 'all-MiniLM-L6-v2')
    
    # Assignment Scoring Weights (adjustable per project)
    SKILL_WEIGHT = float(os.getenv('SKILL_WEIGHT', 0.4))
    WORKLOAD_WEIGHT = float(os.getenv('WORKLOAD_WEIGHT', 0.25))
    EXPERIENCE_WEIGHT = float(os.getenv('EXPERIENCE_WEIGHT', 0.2))
    PRIORITY_WEIGHT = float(os.getenv('PRIORITY_WEIGHT', 0.15))
    
    # Team Configuration
    MAX_WORKLOAD_PER_MEMBER = int(os.getenv('MAX_WORKLOAD', 8))
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    
    @classmethod
    def get_api_settings(cls):
        """Get FastAPI configuration"""
        return {
            "title": cls.SERVICE_NAME,
            "version": cls.SERVICE_VERSION,
            "description": "Intelligent task assignment using machine learning"
        }
