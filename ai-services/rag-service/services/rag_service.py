import structlog
import os
import asyncio
from typing import List, Dict, Any, Optional, Tuple
import uuid
import numpy as np

# ChromaDB and LangChain imports
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from langchain.vectorstores import Chroma
from langchain.embeddings import SentenceTransformerEmbeddings
from langchain.schema import Document as LangChainDocument

# Local imports
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.config import Config
from services.document_processor import DocumentProcessor

logger = structlog.get_logger()

class RAGService:
    """
    Main RAG service handling document storage, embedding, and retrieval
    """
    
    def __init__(self):
        self.config = Config()
        self.document_processor = DocumentProcessor()
        self.embedding_model = None
        self.chroma_client = None
        self.collections = {}
        self.is_initialized = False
        logger.info("RAGService instance created")
    
    async def initialize(self):
        """Initialize the RAG service components"""
        try:
            logger.info("Initializing RAG Service...")
            
            # Create data directory if it doesn't exist
            os.makedirs(self.config.CHROMA_PERSIST_DIR, exist_ok=True)
            
            # Initialize embedding model
            logger.info(f"Loading embedding model: {self.config.EMBEDDING_MODEL}")
            self.embedding_model = SentenceTransformer(self.config.EMBEDDING_MODEL)
            
            # Initialize ChromaDB client
            logger.info("Initializing ChromaDB client...")
            chroma_settings = Settings(
                anonymized_telemetry=False,
                allow_reset=True,
                is_persistent=True
            )
            
            # Additional telemetry disabling
            try:
                chroma_settings.telemetry_enabled = False
            except Exception:
                pass  # Ignore if attribute doesn't exist
                
            self.chroma_client = chromadb.PersistentClient(
                path=self.config.CHROMA_PERSIST_DIR,
                settings=chroma_settings
            )
            
            # Initialize collections for different document types
            await self._initialize_collections()
            
            self.is_initialized = True
            logger.info("RAG Service initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize RAG Service", error=str(e))
            raise
    
    async def _initialize_collections(self):
        """Initialize ChromaDB collections for different document types"""
        try:
            for collection_key, collection_name in self.config.COLLECTIONS.items():
                try:
                    # Try to get existing collection
                    collection = self.chroma_client.get_collection(collection_name)
                    logger.info(f"Found existing collection: {collection_name}")
                except Exception:
                    # Create new collection if it doesn't exist
                    collection = self.chroma_client.create_collection(
                        name=collection_name,
                        metadata={"description": f"Collection for {collection_key}"}
                    )
                    logger.info(f"Created new collection: {collection_name}")
                
                self.collections[collection_key] = collection
                
        except Exception as e:
            logger.error("Error initializing collections", error=str(e))
            raise
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts"""
        try:
            if not texts:
                return []
            
            embeddings = self.embedding_model.encode(texts, convert_to_numpy=True)
            return embeddings.tolist()
            
        except Exception as e:
            logger.error("Error generating embeddings", error=str(e))
            raise
    
    async def store_document(self, 
                           processed_doc: Dict[str, Any], 
                           collection_type: str = "documents") -> Dict[str, Any]:
        """
        Store processed document in ChromaDB
        
        Args:
            processed_doc: Output from DocumentProcessor.process_document()
            collection_type: Type of collection to store in
            
        Returns:
            Storage result with document IDs
        """
        try:
            if collection_type not in self.collections:
                raise ValueError(f"Unknown collection type: {collection_type}")
            
            collection = self.collections[collection_type]
            chunks = processed_doc["chunks"]
            
            if not chunks:
                logger.warning("No chunks to store", document_id=processed_doc["document_id"])
                return {
                    "success": True,
                    "document_id": processed_doc["document_id"],
                    "chunks_stored": 0,
                    "message": "No chunks to store"
                }
            
            # Check for duplicate documents
            existing_docs = collection.get(
                where={"file_hash": processed_doc["file_hash"]},
                limit=1
            )
            
            if existing_docs["ids"]:
                logger.info("Document already exists", 
                          file_hash=processed_doc["file_hash"],
                          existing_id=existing_docs["ids"][0])
                return {
                    "success": True,
                    "document_id": processed_doc["document_id"],
                    "chunks_stored": 0,
                    "message": "Document already exists",
                    "existing_document_id": existing_docs["ids"][0]
                }
            
            # Prepare data for ChromaDB
            chunk_ids = []
            chunk_texts = []
            chunk_metadatas = []
            
            for i, chunk in enumerate(chunks):
                chunk_id = f"{processed_doc['document_id']}_chunk_{i}"
                chunk_ids.append(chunk_id)
                chunk_texts.append(chunk.page_content)
                chunk_metadatas.append(chunk.metadata)
            
            # Generate embeddings
            embeddings = self.generate_embeddings(chunk_texts)
            
            # Store in ChromaDB
            collection.add(
                ids=chunk_ids,
                documents=chunk_texts,
                metadatas=chunk_metadatas,
                embeddings=embeddings
            )
            
            logger.info(
                "Document stored successfully",
                document_id=processed_doc["document_id"],
                chunks=len(chunks),
                collection=collection_type
            )
            
            return {
                "success": True,
                "document_id": processed_doc["document_id"],
                "chunks_stored": len(chunks),
                "collection_type": collection_type,
                "chunk_ids": chunk_ids
            }
            
        except Exception as e:
            logger.error("Error storing document", 
                        document_id=processed_doc.get("document_id"),
                        error=str(e))
            raise
    
    async def semantic_search(self, 
                            query: str, 
                            collection_type: str = "documents",
                            top_k: int = None,
                            similarity_threshold: float = None,
                            filter_metadata: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Perform semantic search on stored documents
        
        Args:
            query: Search query
            collection_type: Collection to search in
            top_k: Number of results to return
            similarity_threshold: Minimum similarity score
            filter_metadata: Metadata filters
            
        Returns:
            List of search results with content and scores
        """
        try:
            if collection_type not in self.collections:
                raise ValueError(f"Unknown collection type: {collection_type}")
            
            collection = self.collections[collection_type]
            top_k = top_k or self.config.DEFAULT_TOP_K
            similarity_threshold = similarity_threshold or self.config.SIMILARITY_THRESHOLD
            
            # Generate query embedding
            query_embedding = self.generate_embeddings([query])[0]
            
            # Perform search
            search_kwargs = {
                "query_embeddings": [query_embedding],
                "n_results": top_k
            }
            
            if filter_metadata:
                search_kwargs["where"] = filter_metadata
            
            results = collection.query(**search_kwargs)
            
            logger.info(f"ChromaDB query returned {len(results['ids'][0]) if results['ids'] else 0} results")
            
            # Process results
            search_results = []
            for i in range(len(results["ids"][0])):
                # Calculate similarity score
                distance = results["distances"][0][i]
                score = 1.0 - distance  # Convert distance to similarity
                
                logger.debug(f"Result {i}: distance={distance:.4f}, similarity={score:.4f}, threshold={similarity_threshold}")
                
                if score >= similarity_threshold:
                    result = {
                        "id": results["ids"][0][i],
                        "content": results["documents"][0][i],
                        "metadata": results["metadatas"][0][i],
                        "similarity_score": float(score),
                        "distance": float(distance)
                    }
                    search_results.append(result)
                    logger.debug(f"Added result {i} to search results")
                else:
                    logger.debug(f"Filtered out result {i}: score {score:.4f} < threshold {similarity_threshold}")
            
            logger.info(
                "Semantic search completed",
                query_length=len(query),
                collection=collection_type,
                total_found=len(results["ids"][0]) if results["ids"] else 0,
                after_filtering=len(search_results),
                similarity_threshold=similarity_threshold,
                top_k=top_k
            )
            
            return search_results
            
        except Exception as e:
            logger.error("Error in semantic search", query=query[:100], error=str(e))
            raise
    
    async def get_relevant_context(self, 
                                 query: str, 
                                 collection_types: List[str] = None,
                                 max_context_length: int = 4000) -> Dict[str, Any]:
        """
        Get relevant context for a query from multiple collections
        
        Args:
            query: User query
            collection_types: Collections to search (default: all)
            max_context_length: Maximum context length in characters
            
        Returns:
            Aggregated context from multiple sources
        """
        try:
            collection_types = collection_types or list(self.collections.keys())
            all_results = []
            context_by_collection = {}
            
            # Search across all specified collections
            for collection_type in collection_types:
                if collection_type in self.collections:
                    results = await self.semantic_search(
                        query=query,
                        collection_type=collection_type,
                        top_k=3  # Get top 3 from each collection
                    )
                    
                    all_results.extend(results)
                    context_by_collection[collection_type] = results
            
            # Sort all results by similarity score
            all_results.sort(key=lambda x: x["similarity_score"], reverse=True)
            
            # Build context string within length limit
            context_parts = []
            current_length = 0
            
            for result in all_results:
                content = result["content"]
                metadata = result["metadata"]
                
                # Add document source information
                source_info = f"[{metadata.get('filename', 'Unknown')}] "
                formatted_content = source_info + content
                
                if current_length + len(formatted_content) <= max_context_length:
                    context_parts.append(formatted_content)
                    current_length += len(formatted_content)
                else:
                    # Add truncated version if space allows
                    remaining_space = max_context_length - current_length - len(source_info)
                    if remaining_space > 100:  # Only add if meaningful space remains
                        truncated = source_info + content[:remaining_space] + "..."
                        context_parts.append(truncated)
                    break
            
            context_text = "\n\n".join(context_parts)
            
            return {
                "context": context_text,
                "context_length": len(context_text),
                "sources_used": len(context_parts),
                "total_results": len(all_results),
                "results_by_collection": context_by_collection,
                "query": query
            }
            
        except Exception as e:
            logger.error("Error getting relevant context", query=query[:100], error=str(e))
            raise
    
    async def list_documents(self, collection_type: str = None) -> Dict[str, Any]:
        """List all documents in collections"""
        try:
            if collection_type and collection_type not in self.collections:
                raise ValueError(f"Unknown collection type: {collection_type}")
            
            collections_to_check = [collection_type] if collection_type else self.collections.keys()
            documents_by_collection = {}
            
            for coll_type in collections_to_check:
                collection = self.collections[coll_type]
                
                # Get all documents (limited to first 1000 for performance)
                all_docs = collection.get(limit=1000)
                
                # Group by document_id to get unique documents
                unique_docs = {}
                for i, doc_id in enumerate(all_docs["ids"]):
                    metadata = all_docs["metadatas"][i]
                    document_id = metadata.get("document_id")
                    
                    if document_id and document_id not in unique_docs:
                        unique_docs[document_id] = {
                            "document_id": document_id,
                            "filename": metadata.get("filename"),
                            "content_type": metadata.get("content_type"),
                            "file_size": metadata.get("file_size"),
                            "processed_at": metadata.get("processed_at"),
                            "total_chunks": metadata.get("total_chunks", 1)
                        }
                
                documents_by_collection[coll_type] = list(unique_docs.values())
            
            return {
                "documents_by_collection": documents_by_collection,
                "total_collections": len(documents_by_collection)
            }
            
        except Exception as e:
            logger.error("Error listing documents", error=str(e))
            raise
    
    async def delete_document(self, document_id: str, collection_type: str = None) -> Dict[str, Any]:
        """Delete a document and all its chunks"""
        try:
            collections_to_check = [collection_type] if collection_type else self.collections.keys()
            deleted_from = []
            
            for coll_type in collections_to_check:
                collection = self.collections[coll_type]
                
                # Find all chunks for this document
                chunks = collection.get(
                    where={"document_id": document_id}
                )
                
                if chunks["ids"]:
                    # Delete all chunks
                    collection.delete(ids=chunks["ids"])
                    deleted_from.append(coll_type)
                    
                    logger.info(
                        "Document deleted",
                        document_id=document_id,
                        collection=coll_type,
                        chunks_deleted=len(chunks["ids"])
                    )
            
            return {
                "success": True,
                "document_id": document_id,
                "deleted_from_collections": deleted_from
            }
            
        except Exception as e:
            logger.error("Error deleting document", document_id=document_id, error=str(e))
            raise
    
    async def get_service_status(self) -> Dict[str, Any]:
        """Get detailed service status"""
        try:
            status = {
                "service": self.config.SERVICE_NAME,
                "version": self.config.SERVICE_VERSION,
                "initialized": self.is_initialized,
                "embedding_model": self.config.EMBEDDING_MODEL,
                "collections": {}
            }
            
            if self.is_initialized:
                for coll_type, collection in self.collections.items():
                    try:
                        count_result = collection.count()
                        status["collections"][coll_type] = {
                            "name": collection.name,
                            "chunk_count": count_result
                        }
                    except Exception as e:
                        status["collections"][coll_type] = {
                            "name": collection.name,
                            "error": str(e)
                        }
            
            return status
            
        except Exception as e:
            logger.error("Error getting service status", error=str(e))
            return {
                "service": self.config.SERVICE_NAME,
                "error": str(e),
                "initialized": False
            }
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            logger.info("Cleaning up RAG Service...")
            # ChromaDB client cleanup is handled automatically
            self.is_initialized = False
            logger.info("RAG Service cleanup completed")
            
        except Exception as e:
            logger.error("Error during cleanup", error=str(e)) 