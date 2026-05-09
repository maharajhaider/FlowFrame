from .health_routes import router as health_router
from .document_routes import router as document_router
from .search_routes import router as search_router

__all__ = ['health_router', 'document_router', 'search_router'] 