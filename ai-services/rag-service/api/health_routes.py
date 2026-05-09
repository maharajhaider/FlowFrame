from fastapi import APIRouter, HTTPException, Request
from datetime import datetime
import structlog

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.config import Config

logger = structlog.get_logger()

router = APIRouter()

@router.get("/health")
async def health_check():
    """
    Health check endpoint to verify service is running
    """
    try:
        return {
            "status": "healthy",
            "service": Config.SERVICE_NAME,
            "version": Config.SERVICE_VERSION,
            "timestamp": datetime.now().isoformat(),
            "port": Config.PORT
        }
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(status_code=500, detail="Service unhealthy")

@router.get("/status")
async def service_status(request: Request):
    """
    Detailed service status for monitoring
    """
    try:
        rag_service = getattr(request.app.state, 'rag_service', None)
        
        if not rag_service:
            return {
                "service": Config.SERVICE_NAME,
                "version": Config.SERVICE_VERSION,
                "status": "initializing",
                "error": "RAG service not initialized"
            }
        
        status = await rag_service.get_service_status()
        status.update({
            "config": {
                "chroma_persist_dir": Config.CHROMA_PERSIST_DIR,
                "embedding_model": Config.EMBEDDING_MODEL,
                "max_file_size_mb": Config.MAX_FILE_SIZE_MB,
                "chunk_size": Config.CHUNK_SIZE,
                "chunk_overlap": Config.CHUNK_OVERLAP,
                "supported_file_types": len(Config.SUPPORTED_TEXT_TYPES + Config.SUPPORTED_IMAGE_TYPES)
            }
        })
        
        return status
        
    except Exception as e:
        logger.error("Error getting service status", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error retrieving status: {str(e)}")

@router.get("/collections")
async def list_collections(request: Request):
    """
    List all available collections and their document counts
    """
    try:
        rag_service = getattr(request.app.state, 'rag_service', None)
        
        if not rag_service:
            raise HTTPException(status_code=503, detail="RAG service not initialized")
        
        collections_info = {}
        for coll_type, collection in rag_service.collections.items():
            try:
                count = collection.count()
                collections_info[coll_type] = {
                    "name": collection.name,
                    "document_count": count,
                    "type": coll_type
                }
            except Exception as e:
                collections_info[coll_type] = {
                    "name": collection.name,
                    "error": str(e),
                    "type": coll_type
                }
        
        return {
            "collections": collections_info,
            "total_collections": len(collections_info)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error listing collections", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error listing collections: {str(e)}") 