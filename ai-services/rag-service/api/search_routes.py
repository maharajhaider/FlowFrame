from fastapi import APIRouter, HTTPException, Request, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import structlog

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.config import Config

logger = structlog.get_logger()

router = APIRouter()

# Pydantic models for request/response validation
class SearchRequest(BaseModel):
    query: str
    collection_type: Optional[str] = "documents"
    top_k: Optional[int] = None
    similarity_threshold: Optional[float] = None
    filter_metadata: Optional[Dict[str, Any]] = None

class SearchResult(BaseModel):
    id: str
    content: str
    metadata: Dict[str, Any]
    similarity_score: float
    distance: float

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    total_results: int
    collection_type: str
    processing_time_ms: float

class ContextRequest(BaseModel):
    query: str
    collection_types: Optional[List[str]] = None
    max_context_length: Optional[int] = 4000

class ContextResponse(BaseModel):
    context: str
    context_length: int
    sources_used: int
    total_results: int
    results_by_collection: Dict[str, List[Dict[str, Any]]]
    query: str

@router.post("/semantic", response_model=SearchResponse)
async def semantic_search(
    request: Request,
    search_request: SearchRequest
):
    """
    Perform semantic search on documents
    
    Args:
        search_request: Search parameters including query and filters
        
    Returns:
        Search results with similarity scores
    """
    try:
        import time
        start_time = time.time()
        
        rag_service = getattr(request.app.state, 'rag_service', None)
        
        if not rag_service:
            raise HTTPException(status_code=503, detail="RAG service not initialized")
        
        if not rag_service.is_initialized:
            raise HTTPException(status_code=503, detail="RAG service not ready")
        
        # Validate collection type
        if search_request.collection_type not in rag_service.collections:
            available_types = list(rag_service.collections.keys())
            raise HTTPException(
                status_code=400,
                detail=f"Invalid collection type. Available: {available_types}"
            )
        
        # Perform semantic search
        results = await rag_service.semantic_search(
            query=search_request.query,
            collection_type=search_request.collection_type,
            top_k=search_request.top_k,
            similarity_threshold=search_request.similarity_threshold,
            filter_metadata=search_request.filter_metadata
        )
        
        processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Convert results to response format
        search_results = [
            SearchResult(
                id=result["id"],
                content=result["content"],
                metadata=result["metadata"],
                similarity_score=result["similarity_score"],
                distance=result["distance"]
            )
            for result in results
        ]
        
        logger.info(
            "Semantic search completed",
            query_length=len(search_request.query),
            results=len(search_results),
            processing_time_ms=processing_time,
            collection=search_request.collection_type
        )
        
        return SearchResponse(
            query=search_request.query,
            results=search_results,
            total_results=len(search_results),
            collection_type=search_request.collection_type,
            processing_time_ms=processing_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in semantic search", query=search_request.query[:100], error=str(e))
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/simple")
async def simple_search(
    request: Request,
    query: str = Query(..., description="Search query"),
    collection_type: str = Query("documents", description="Collection to search"),
    top_k: int = Query(5, description="Number of results to return"),
    similarity_threshold: float = Query(0.7, description="Minimum similarity score")
):
    """
    Simple GET endpoint for semantic search
    """
    try:
        search_request = SearchRequest(
            query=query,
            collection_type=collection_type,
            top_k=top_k,
            similarity_threshold=similarity_threshold
        )
        
        return await semantic_search(request, search_request)
        
    except Exception as e:
        logger.error("Error in simple search", query=query[:100], error=str(e))
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.post("/context", response_model=ContextResponse)
async def get_relevant_context(
    request: Request,
    context_request: ContextRequest
):
    """
    Get relevant context for a query from multiple collections
    This is the main endpoint for RAG integration with LLM services
    
    Args:
        context_request: Context retrieval parameters
        
    Returns:
        Aggregated context from relevant documents
    """
    try:
        rag_service = getattr(request.app.state, 'rag_service', None)
        
        if not rag_service:
            raise HTTPException(status_code=503, detail="RAG service not initialized")
        
        if not rag_service.is_initialized:
            raise HTTPException(status_code=503, detail="RAG service not ready")
        
        # Get relevant context
        context_result = await rag_service.get_relevant_context(
            query=context_request.query,
            collection_types=context_request.collection_types,
            max_context_length=context_request.max_context_length
        )
        
        logger.info(
            "Context retrieval completed",
            query_length=len(context_request.query),
            context_length=context_result["context_length"],
            sources_used=context_result["sources_used"],
            total_results=context_result["total_results"]
        )
        
        return ContextResponse(**context_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error getting context", query=context_request.query[:100], error=str(e))
        raise HTTPException(status_code=500, detail=f"Context retrieval failed: {str(e)}")

@router.get("/context-simple")
async def get_context_simple(
    request: Request,
    query: str = Query(..., description="Query for context retrieval"),
    max_length: int = Query(4000, description="Maximum context length"),
    collections: Optional[str] = Query(None, description="Comma-separated collection types")
):
    """
    Simple GET endpoint for context retrieval
    """
    try:
        collection_types = None
        if collections:
            collection_types = [c.strip() for c in collections.split(",")]
        
        context_request = ContextRequest(
            query=query,
            collection_types=collection_types,
            max_context_length=max_length
        )
        
        return await get_relevant_context(request, context_request)
        
    except Exception as e:
        logger.error("Error in simple context retrieval", query=query[:100], error=str(e))
        raise HTTPException(status_code=500, detail=f"Context retrieval failed: {str(e)}")

@router.get("/collections/{collection_type}/search")
async def search_in_collection(
    request: Request,
    collection_type: str,
    query: str = Query(..., description="Search query"),
    top_k: int = Query(5, description="Number of results"),
    similarity_threshold: float = Query(0.7, description="Minimum similarity")
):
    """
    Search within a specific collection
    """
    try:
        rag_service = getattr(request.app.state, 'rag_service', None)
        
        if not rag_service:
            raise HTTPException(status_code=503, detail="RAG service not initialized")
        
        if collection_type not in rag_service.collections:
            available_types = list(rag_service.collections.keys())
            raise HTTPException(
                status_code=404,
                detail=f"Collection '{collection_type}' not found. Available: {available_types}"
            )
        
        results = await rag_service.semantic_search(
            query=query,
            collection_type=collection_type,
            top_k=top_k,
            similarity_threshold=similarity_threshold
        )
        
        return {
            "collection_type": collection_type,
            "query": query,
            "results": results,
            "total_results": len(results)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error searching collection", collection=collection_type, error=str(e))
        raise HTTPException(status_code=500, detail=f"Collection search failed: {str(e)}")

@router.get("/similar/{document_id}")
async def find_similar_documents(
    request: Request,
    document_id: str,
    top_k: int = Query(5, description="Number of similar documents"),
    similarity_threshold: float = Query(0.7, description="Minimum similarity")
):
    """
    Find documents similar to a given document
    """
    try:
        rag_service = getattr(request.app.state, 'rag_service', None)
        
        if not rag_service:
            raise HTTPException(status_code=503, detail="RAG service not initialized")
        
        # Find the document first
        document_found = False
        source_content = None
        source_collection = None
        
        for coll_type, collection in rag_service.collections.items():
            chunks = collection.get(
                where={"document_id": document_id},
                limit=1,
                include=["documents"]
            )
            
            if chunks["ids"]:
                document_found = True
                source_content = chunks["documents"][0]
                source_collection = coll_type
                break
        
        if not document_found:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Use the document content as query to find similar documents
        results = await rag_service.semantic_search(
            query=source_content,
            collection_type=source_collection,
            top_k=top_k + 1,  # +1 to account for the source document itself
            similarity_threshold=similarity_threshold
        )
        
        # Filter out the source document
        similar_results = [
            result for result in results 
            if not result["id"].startswith(document_id)
        ][:top_k]
        
        return {
            "source_document_id": document_id,
            "similar_documents": similar_results,
            "total_similar": len(similar_results)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error finding similar documents", document_id=document_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Similar document search failed: {str(e)}") 

@router.get("/debug/test-embeddings")
async def test_embeddings(request: Request):
    """Debug endpoint to test embedding generation and ChromaDB query"""
    try:
        rag_service = getattr(request.app.state, 'rag_service', None)
        if not rag_service:
            return {"error": "RAG service not initialized"}
        
        # Test embedding generation
        test_query = "test authentication"
        embedding = rag_service.generate_embeddings([test_query])[0]
        
        # Test ChromaDB collection access
        collection = rag_service.collections["documents"]
        
        # Try to get all documents in collection
        all_results = collection.get(limit=5, include=["metadatas", "documents", "embeddings"])
        
        # Try a simple query
        query_results = collection.query(
            query_embeddings=[embedding],
            n_results=3,
            include=["metadatas", "documents", "distances"]
        )
        
        return {
            "embedding_test": {
                "query": test_query,
                "embedding_shape": len(embedding),
                "embedding_sample": embedding[:5].tolist()  # First 5 dimensions
            },
            "collection_test": {
                "total_documents": len(all_results["ids"]) if all_results["ids"] else 0,
                "sample_documents": all_results["documents"][:2] if all_results["documents"] else [],
                "sample_metadata": all_results["metadatas"][:2] if all_results["metadatas"] else []
            },
            "query_test": {
                "results_found": len(query_results["ids"][0]) if query_results["ids"] else 0,
                "distances": query_results["distances"][0][:3] if query_results["distances"] else [],
                "sample_content": query_results["documents"][0][:2] if query_results["documents"] else []
            }
        }
        
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__} 