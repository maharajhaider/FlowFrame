import structlog
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from utils.config import Config
from api import router
from models import TaskAssignmentModel

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

# Global model instance
assignment_model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan"""
    global assignment_model
    
    logger.info("Starting ML Assignment Service...")
    
    # Initialize the assignment model
    assignment_model = TaskAssignmentModel()
    success = assignment_model.initialize()
    
    if success:
        logger.info("ML Assignment Service started successfully")
    else:
        logger.error("Failed to initialize assignment model")
    
    # Store model instance in app state
    app.state.assignment_model = assignment_model
    
    yield
    
    logger.info("Shutting down ML Assignment Service...")

# Create FastAPI application
app = FastAPI(
    **Config.get_api_settings(),
    lifespan=lifespan
)

# Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="", tags=["assignment"])

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
