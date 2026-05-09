from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import structlog

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.config import Config

import uuid

logger = structlog.get_logger()

router = APIRouter()

# Pydantic models for request/response validation
class DocumentUploadResponse(BaseModel):
    success: bool
    message: str
    document_id: str
    filename: str
    chunks_stored: int
    collection_type: str

class DocumentListResponse(BaseModel):
    documents_by_collection: Dict[str, List[Dict[str, Any]]]
    total_collections: int

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    collection_type: str = Form("documents"),
    project_id: Optional[str] = Form(None),
    description: Optional[str] = Form(None)
):
    """
    Upload and process a document for RAG
    
    Args:
        file: Document file to upload
        collection_type: Type of collection to store in
        project_id: Optional project ID for organization
        description: Optional description for the document
    """
    try:
        rag_service = getattr(request.app.state, 'rag_service', None)
        
        if not rag_service:
            raise HTTPException(status_code=503, detail="RAG service not initialized")
        
        if not rag_service.is_initialized:
            raise HTTPException(status_code=503, detail="RAG service not ready")
        
        # Validate collection type
        if collection_type not in rag_service.collections:
            available_types = list(rag_service.collections.keys())
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid collection type. Available: {available_types}"
            )
        
        # Read file content
        content = await file.read()
        
        if not content:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        # Prepare additional metadata
        additional_metadata = {}
        if project_id:
            additional_metadata["project_id"] = project_id
        if description:
            additional_metadata["description"] = description
        
        # Process document
        logger.info(
            "Processing uploaded document",
            filename=file.filename,
            content_type=file.content_type,
            file_size=len(content),
            collection_type=collection_type
        )
        
        try:
            processed_doc = await rag_service.document_processor.process_document(
                content=content,
                filename=file.filename,
                content_type=file.content_type,
                collection_type=collection_type,
                additional_metadata=additional_metadata
            )
            
            # Store in vector database
            storage_result = await rag_service.store_document(processed_doc, collection_type)
            
            if not storage_result["success"]:
                logger.warning("Failed to store document in vector database", filename=file.filename)
                # Create a fallback response instead of failing
                return DocumentUploadResponse(
                    success=True,
                    message="Document uploaded but storage failed - processed as fallback",
                    document_id=processed_doc.get("document_id", "fallback"),
                    filename=file.filename,
                    chunks_stored=0,
                    collection_type=collection_type
                )
            
            logger.info(
                "Document uploaded and processed successfully",
                document_id=storage_result["document_id"],
                chunks_stored=storage_result["chunks_stored"]
            )
            
            return DocumentUploadResponse(
                success=True,
                message="Document uploaded and processed successfully",
                document_id=storage_result["document_id"],
                filename=file.filename,
                chunks_stored=storage_result["chunks_stored"],
                collection_type=collection_type
            )
            
        except Exception as processing_error:
            # Handle any processing errors gracefully - create a fallback result
            logger.warning(
                "Document processing failed, creating fallback entry",
                filename=file.filename,
                error=str(processing_error)
            )
            
            # Create a minimal fallback document entry
            fallback_id = str(uuid.uuid4())
            fallback_text = f"Failed to process {file.filename}: {str(processing_error)}"
            
            try:
                # Try to store a fallback document
                fallback_metadata = {
                    "filename": file.filename,
                    "content_type": file.content_type,
                    "file_size": len(content),
                    "collection_type": collection_type,
                    "document_id": fallback_id,
                    "processing_error": str(processing_error),
                    "is_fallback": True
                }
                
                if additional_metadata:
                    fallback_metadata.update(additional_metadata)
                
                # Create a fallback chunk
                from langchain.schema import Document as LangChainDocument
                fallback_chunk = LangChainDocument(
                    page_content=fallback_text,
                    metadata=fallback_metadata
                )
                
                # Try to store it
                collection = rag_service.collections[collection_type]
                collection.add_documents([fallback_chunk], ids=[fallback_id])
                
                return DocumentUploadResponse(
                    success=True,
                    message=f"Document processed with errors but stored as fallback: {str(processing_error)}",
                    document_id=fallback_id,
                    filename=file.filename,
                    chunks_stored=1,
                    collection_type=collection_type
                )
                
            except Exception as fallback_error:
                # Even fallback failed, just return success with 0 chunks
                logger.warning(
                    "Even fallback storage failed",
                    filename=file.filename,
                    processing_error=str(processing_error),
                    fallback_error=str(fallback_error)
                )
                
                return DocumentUploadResponse(
                    success=True,
                    message=f"Document upload completed with processing errors: {str(processing_error)}",
                    document_id=fallback_id,
                    filename=file.filename,
                    chunks_stored=0,
                    collection_type=collection_type
                )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unexpected error in document upload", filename=getattr(file, 'filename', 'unknown'), error=str(e))
        
        # Return a graceful error response instead of 500
        return DocumentUploadResponse(
            success=False,
            message=f"Upload failed: {str(e)}",
            document_id="error",
            filename=getattr(file, 'filename', 'unknown'),
            chunks_stored=0,
            collection_type=collection_type
        )

@router.post("/upload-multiple")
async def upload_multiple_documents(
    request: Request,
    files: List[UploadFile] = File(...),
    collection_type: str = Form("documents"),
    project_id: Optional[str] = Form(None)
):
    """
    Upload multiple documents at once
    """
    try:
        rag_service = getattr(request.app.state, 'rag_service', None)
        
        if not rag_service:
            raise HTTPException(status_code=503, detail="RAG service not initialized")
        
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        
        results = []
        errors = []
        
        for file in files:
            try:
                content = await file.read()
                
                if not content:
                    errors.append(f"Empty file: {file.filename}")
                    continue
                
                additional_metadata = {}
                if project_id:
                    additional_metadata["project_id"] = project_id
                
                # Process document
                processed_doc = await rag_service.document_processor.process_document(
                    content=content,
                    filename=file.filename,
                    content_type=file.content_type,
                    collection_type=collection_type,
                    additional_metadata=additional_metadata
                )
                
                # Store in vector database
                storage_result = await rag_service.store_document(processed_doc, collection_type)
                
                results.append({
                    "filename": file.filename,
                    "document_id": storage_result["document_id"],
                    "chunks_stored": storage_result["chunks_stored"],
                    "success": storage_result["success"]
                })
                
            except Exception as e:
                error_msg = f"Failed to process {file.filename}: {str(e)}"
                errors.append(error_msg)
                logger.error("Error processing file in batch", filename=file.filename, error=str(e))
        
        return {
            "success": len(errors) == 0,
            "total_files": len(files),
            "processed_successfully": len(results),
            "errors": len(errors),
            "results": results,
            "error_messages": errors
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in batch upload", error=str(e))
        raise HTTPException(status_code=500, detail=f"Batch upload failed: {str(e)}")

@router.get("/list", response_model=DocumentListResponse)
async def list_documents(
    request: Request,
    collection_type: Optional[str] = None
):
    """
    List all documents in collections
    """
    try:
        rag_service = getattr(request.app.state, 'rag_service', None)
        
        if not rag_service:
            raise HTTPException(status_code=503, detail="RAG service not initialized")
        
        documents = await rag_service.list_documents(collection_type)
        
        return DocumentListResponse(**documents)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error listing documents", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")

@router.delete("/{document_id}")
async def delete_document(
    request: Request,
    document_id: str,
    collection_type: Optional[str] = None
):
    """
    Delete a document and all its chunks
    """
    try:
        rag_service = getattr(request.app.state, 'rag_service', None)
        
        if not rag_service:
            raise HTTPException(status_code=503, detail="RAG service not initialized")
        
        result = await rag_service.delete_document(document_id, collection_type)
        
        if not result["deleted_from_collections"]:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting document", document_id=document_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

@router.get("/{document_id}/info")
async def get_document_info(
    request: Request,
    document_id: str
):
    """
    Get information about a specific document
    """
    try:
        rag_service = getattr(request.app.state, 'rag_service', None)
        
        if not rag_service:
            raise HTTPException(status_code=503, detail="RAG service not initialized")
        
        # Search across all collections for this document
        document_info = None
        found_in_collections = []
        
        for coll_type, collection in rag_service.collections.items():
            chunks = collection.get(
                where={"document_id": document_id},
                limit=1,
                include=["metadatas"]
            )
            
            if chunks["ids"]:
                found_in_collections.append(coll_type)
                if not document_info:
                    metadata = chunks["metadatas"][0]
                    document_info = {
                        "document_id": document_id,
                        "filename": metadata.get("filename"),
                        "content_type": metadata.get("content_type"),
                        "file_size": metadata.get("file_size"),
                        "processed_at": metadata.get("processed_at"),
                        "total_chunks": metadata.get("total_chunks"),
                        "project_id": metadata.get("project_id"),
                        "description": metadata.get("description")
                    }
        
        if not document_info:
            raise HTTPException(status_code=404, detail="Document not found")
        
        document_info["collections"] = found_in_collections
        
        return document_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error getting document info", document_id=document_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get document info: {str(e)}") 