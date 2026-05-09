const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');
const ContextFile = require('../models/ContextFile');
const { requireAuth } = require('../utils/auth');
const gridFSService = require('../services/gridFSService');
const FormData = require('form-data');
const axios = require('axios');

const router = express.Router();

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/context-files');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, 
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv', 'application/json',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// RAG Service Configuration
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8002';

/**
 * Upload file to RAG service for embedding processing
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} filename - Original filename
 * @param {string} contentType - MIME type
 * @param {string} collectionType - RAG collection type
 * @returns {Promise<Object>} RAG upload result
 */
async function uploadToRAGService(fileBuffer, filename, contentType, collectionType = 'project_context') {
  try {
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: filename,
      contentType: contentType
    });
    formData.append('collection_type', collectionType);
    formData.append('project_id', 'knowledge_base');
    formData.append('description', `Knowledge base document: ${filename}`);

    const response = await axios.post(`${RAG_SERVICE_URL}/documents/upload`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 30000 // 30 second timeout
    });

    const result = response.data;
    console.log(`Successfully uploaded ${filename} to RAG service:`, {
      document_id: result.document_id,
      chunks_stored: result.chunks_stored,
      collection_type: result.collection_type
    });

    return {
      success: true,
      ragDocumentId: result.document_id,
      chunksStored: result.chunks_stored,
      collectionType: result.collection_type
    };

  } catch (error) {
    const errorMessage = error.response 
      ? `RAG service responded with ${error.response.status}: ${error.response.data || error.message}`
      : error.message;
    console.error(`Failed to upload ${filename} to RAG service:`, errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

router.get('/global', requireAuth, async (req, res) => {
  try {
    const { folderId } = req.query;

    const query = {};
    
    if (folderId && folderId !== 'root') {
      if (!mongoose.Types.ObjectId.isValid(folderId)) {
        return res.status(400).json({ error: 'Invalid folder ID' });
      }
      query.parentFolderId = folderId;
    } else {
      query.$or = [
        { parentFolderId: null },
        { parentFolderId: { $exists: false } }
      ];
    }

    const files = await ContextFile.find(query)
      .populate('uploadedBy', 'name email')
      .sort({ isFolder: -1, name: 1 });

    res.json(files);
  } catch (error) {
    console.error('Error fetching context files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { parentFolderId, tags, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const maxBase64Size = 5 * 1024 * 1024;
    let storageMethod = req.file.size > maxBase64Size ? 'gridfs' : 'base64';

    let gridFSFileId = null;
    let base64Data = null;
    let filePath = null;

    if (storageMethod === 'gridfs') {
      try {
        const fileBuffer = await fs.readFile(req.file.path);
        gridFSFileId = await gridFSService.uploadFile(fileBuffer, req.file.originalname, {
          mimeType: req.file.mimetype,
          size: req.file.size,
          uploadedBy: req.user.id
        });
        
        await fs.unlink(req.file.path);
      } catch (error) {
        console.error('GridFS upload failed, falling back to base64:', error);
        const fileBuffer = await fs.readFile(req.file.path);
        base64Data = fileBuffer.toString('base64');
        storageMethod = 'base64';
        await fs.unlink(req.file.path);
      }
    } else {
      const fileBuffer = await fs.readFile(req.file.path);
      base64Data = fileBuffer.toString('base64');
      
      await fs.unlink(req.file.path);
    }

    let thumbnail = null;
    if (req.file.mimetype.startsWith('image/')) {
      thumbnail = `data:${req.file.mimetype};base64,${Buffer.from('placeholder').toString('base64')}`;
    }

    let folderPath = '/';
    if (parentFolderId && parentFolderId !== 'root') {
      if (!mongoose.Types.ObjectId.isValid(parentFolderId)) {
        return res.status(400).json({ error: 'Invalid parent folder ID' });
      }
      const parentFolder = await ContextFile.findById(parentFolderId);
      if (!parentFolder || !parentFolder.isFolder) {
        return res.status(400).json({ error: 'Parent folder not found' });
      }
      folderPath = parentFolder.folderPath + parentFolder.name + '/';
    }

    const contextFile = new ContextFile({
      name: req.file.originalname,
      originalName: req.file.originalname,
      fileType: path.extname(req.file.originalname).toLowerCase(),
      mimeType: req.file.mimetype,
      size: req.file.size,
      gridFSFileId,
      base64Data,
      path: filePath,
      thumbnail,
      uploadedBy: req.user.id,
      parentFolderId: parentFolderId === 'root' ? null : parentFolderId,
      folderPath,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      description: description || '',
      storageMethod
    });

    await contextFile.save();

    // Upload to RAG service for embedding processing (in background)
    // We do this after saving to knowledge base to ensure main functionality isn't affected
    let ragResult = { success: false };
    try {
      let fileBuffer;
      
      // Get file buffer for RAG upload
      if (storageMethod === 'gridfs') {
        // Read from GridFS
        try {
          const gridFSResult = await gridFSService.downloadFile(gridFSFileId);
          fileBuffer = gridFSResult.buffer;
        } catch (gridError) {
          console.warn('Could not retrieve file from GridFS for RAG upload:', gridError.message);
          fileBuffer = null;
        }
      } else {
        // Convert base64 back to buffer
        fileBuffer = Buffer.from(base64Data, 'base64');
      }

      // Only attempt RAG upload if we have the file buffer
      if (fileBuffer) {
        ragResult = await uploadToRAGService(
          fileBuffer,
          req.file.originalname,
          req.file.mimetype,
          'project_context' // Use project_context collection for knowledge base files
        );
        
        if (ragResult.success) {
          console.log(`Knowledge base file ${req.file.originalname} successfully processed by RAG service`);
        }
      }
    } catch (ragError) {
      console.warn('RAG service upload failed, but file saved to knowledge base:', ragError.message);
      // Don't let RAG failures affect the main upload response
    }

    const populatedFile = await ContextFile.findById(contextFile._id)
      .populate('uploadedBy', 'name email');

    // Optionally include RAG status in response for debugging
    const response = {
      ...populatedFile.toObject(),
      rag_processed: ragResult.success,
      rag_document_id: ragResult.ragDocumentId || null,
      rag_chunks_stored: ragResult.chunksStored || 0
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error uploading context file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/folder', requireAuth, async (req, res) => {
  try {
    const { name, parentFolderId, description } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const existingFolder = await ContextFile.findOne({
      name: name.trim(),
      isFolder: true,
      parentFolderId: parentFolderId === 'root' ? null : parentFolderId,
    });

    if (existingFolder) {
      return res.status(400).json({ error: 'A folder with this name already exists' });
    }

    let folderPath = '/';
    if (parentFolderId && parentFolderId !== 'root') {
      if (!mongoose.Types.ObjectId.isValid(parentFolderId)) {
        return res.status(400).json({ error: 'Invalid parent folder ID' });
      }
      const parentFolder = await ContextFile.findById(parentFolderId);
      if (!parentFolder || !parentFolder.isFolder) {
        return res.status(400).json({ error: 'Parent folder not found' });
      }
      folderPath = parentFolder.folderPath + parentFolder.name + '/';
    }

    const folder = new ContextFile({
      name: name.trim(),
      originalName: name.trim(),
      fileType: 'folder',
      mimeType: 'application/x-directory',
      size: 0,
      path: '',
      uploadedBy: req.user.id,
      isFolder: true,
      parentFolderId: parentFolderId === 'root' ? null : parentFolderId,
      folderPath,
      description: description || '',
    });

    await folder.save();

    const populatedFolder = await ContextFile.findById(folder._id)
      .populate('uploadedBy', 'name email');

    res.status(201).json(populatedFolder);
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/download/:fileId', requireAuth, async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const contextFile = await ContextFile.findById(fileId);
    if (!contextFile) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (contextFile.isFolder) {
      return res.status(400).json({ error: 'Cannot download a folder' });
    }

    let fileBuffer;

    if (contextFile.storageMethod === 'gridfs') {
      if (!contextFile.gridFSFileId) {
        return res.status(404).json({ error: 'File not found in GridFS' });
      }
      try {
        fileBuffer = await gridFSService.downloadFile(contextFile.gridFSFileId);
      } catch (error) {
        console.error('GridFS download failed:', error);
        return res.status(404).json({ error: 'File not found in GridFS' });
      }
    } else if (contextFile.storageMethod === 'base64') {
      if (!contextFile.base64Data) {
        return res.status(404).json({ error: 'File data not found' });
      }
      fileBuffer = Buffer.from(contextFile.base64Data, 'base64');
    } else {
      try {
        await fs.access(contextFile.path);
        fileBuffer = await fs.readFile(contextFile.path);
      } catch (error) {
        return res.status(404).json({ error: 'File not found on disk' });
      }
    }

    // Set headers for download
    res.setHeader('Content-Type', contextFile.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${contextFile.originalName}"`);
    res.setHeader('Content-Length', contextFile.size);

    res.send(fileBuffer);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a context file or folder
router.delete('/:fileId', requireAuth, async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const contextFile = await ContextFile.findById(fileId);
    if (!contextFile) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (contextFile.isFolder) {
      await deleteFolderRecursively(fileId);
    } else {
      if (contextFile.storageMethod === 'gridfs' && contextFile.gridFSFileId) {
        try {
          await gridFSService.deleteFile(contextFile.gridFSFileId);
        } catch (error) {
          console.error('Error deleting file from GridFS:', error);
        }
      } else if (contextFile.storageMethod === 'local' && contextFile.path) {
        try {
          await fs.unlink(contextFile.path);
        } catch (error) {
          console.error('Error deleting file from disk:', error);
        }
      }
    }

    await ContextFile.findByIdAndDelete(fileId);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function deleteFolderRecursively(folderId) {
  const children = await ContextFile.find({ parentFolderId: folderId });
  
  for (const child of children) {
    if (child.isFolder) {
      await deleteFolderRecursively(child._id);
    } else {
      if (child.storageMethod === 'gridfs' && child.gridFSFileId) {
        try {
          await gridFSService.deleteFile(child.gridFSFileId);
        } catch (error) {
          console.error('Error deleting file from GridFS:', error);
        }
      } else if (child.storageMethod === 'local' && child.path) {
        try {
          await fs.unlink(child.path);
        } catch (error) {
          console.error('Error deleting file from disk:', error);
        }
      }
    }
    await ContextFile.findByIdAndDelete(child._id);
  }
}

router.patch('/:fileId', requireAuth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { name, description, tags } = req.body;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const contextFile = await ContextFile.findById(fileId);
    if (!contextFile) {
      return res.status(404).json({ error: 'File not found' });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (tags) updateData.tags = tags.split(',').map(tag => tag.trim());

    const updatedFile = await ContextFile.findByIdAndUpdate(
      fileId,
      updateData,
      { new: true }
    ).populate('uploadedBy', 'name email');

    res.json(updatedFile);
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 