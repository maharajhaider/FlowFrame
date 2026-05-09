import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # API Configuration
    SERVICE_NAME = "RAG Service"
    SERVICE_VERSION = "1.0.0"
    PORT = int(os.getenv('RAG_SERVICE_PORT', 8002))
    HOST = os.getenv('RAG_SERVICE_HOST', '0.0.0.0')
    
    # Node.js Backend Integration
    MERN_API_BASE_URL = os.getenv('MERN_API_BASE_URL', 'http://localhost:8000')
    
    # ChromaDB Configuration
    CHROMA_PERSIST_DIR = os.getenv('CHROMA_PERSIST_DIR', './data/chroma')
    CHROMA_HOST = os.getenv('CHROMA_HOST', 'localhost')
    CHROMA_PORT = int(os.getenv('CHROMA_PORT', 8001))
    
    # Embedding Model Configuration
    EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL', 'all-MiniLM-L6-v2')
    
    # Document Processing Configuration
    MAX_FILE_SIZE_MB = int(os.getenv('MAX_FILE_SIZE_MB', 50))
    MAX_IMAGE_SIZE_MB = int(os.getenv('MAX_IMAGE_SIZE_MB', 20))
    CHUNK_SIZE = int(os.getenv('CHUNK_SIZE', 1000))
    CHUNK_OVERLAP = int(os.getenv('CHUNK_OVERLAP', 200))
    
    # Retrieval Configuration
    DEFAULT_TOP_K = int(os.getenv('DEFAULT_TOP_K', 5))
    SIMILARITY_THRESHOLD = float(os.getenv('SIMILARITY_THRESHOLD', 0.05))  # Lowered from 0.7 to 0.05 for better search results
    
    # Supported file types
    SUPPORTED_TEXT_TYPES = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
    
    SUPPORTED_IMAGE_TYPES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp'
    ]
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    
    # Collection names for different document types
    COLLECTIONS = {
        'documents': 'project_documents',
        'company_info': 'company_information',
        'project_context': 'project_context',
        'requirements': 'requirements_docs'
    }
    
    @classmethod
    def get_api_settings(cls):
        """Get FastAPI configuration"""
        return {
            "title": cls.SERVICE_NAME,
            "version": cls.SERVICE_VERSION,
            "description": "RAG service for document processing and semantic search"
        }
    
    @classmethod
    def get_max_file_size_bytes(cls):
        """Get max file size in bytes"""
        return cls.MAX_FILE_SIZE_MB * 1024 * 1024
    
    @classmethod
    def get_max_image_size_bytes(cls):
        """Get max image size in bytes"""
        return cls.MAX_IMAGE_SIZE_MB * 1024 * 1024 