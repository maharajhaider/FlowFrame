import structlog
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

# Disable ChromaDB telemetry to prevent capture() errors
os.environ["ANONYMIZED_TELEMETRY"] = "False"

from utils.config import Config
from services.rag_service import RAGService

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Global RAG service instance
rag_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan"""
    global rag_service
    
    logger.info("Starting RAG Service...")
    
    # Initialize the RAG service
    try:
        rag_service = RAGService()
        await rag_service.initialize()
        
        # Store service instance in app state
        app.state.rag_service = rag_service
        
        logger.info("RAG Service started successfully")
    except Exception as e:
        logger.error("Failed to initialize RAG service", error=str(e))
        raise
    
    yield
    
    logger.info("Shutting down RAG Service...")
    if rag_service:
        await rag_service.cleanup()

# Create FastAPI application
app = FastAPI(
    **Config.get_api_settings(),
    lifespan=lifespan
)

# Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # React dev server
        "http://localhost:8000",  # Node.js backend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include API routes after app creation
from api.document_routes import router as document_router
from api.search_routes import router as search_router
from api.health_routes import router as health_router

app.include_router(health_router, prefix="", tags=["health"])
app.include_router(document_router, prefix="/documents", tags=["documents"])
app.include_router(search_router, prefix="/search", tags=["search"])

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": Config.SERVICE_NAME,
        "version": Config.SERVICE_VERSION,
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    logger.info(f"Starting {Config.SERVICE_NAME} on {Config.HOST}:{Config.PORT}")
    
    uvicorn.run(
        "main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=True,  # Enable for development
        log_level=Config.LOG_LEVEL.lower()
    )
