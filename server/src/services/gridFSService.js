const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

class GridFSService {
  constructor() {
    this.bucket = null;
  }

  async initBucket() {
    try {
      if (mongoose.connection.readyState === 1) {
        this.bucket = new GridFSBucket(mongoose.connection.db, {
          bucketName: 'contextFiles'
        });
      } else {
        return new Promise((resolve) => {
          mongoose.connection.once('connected', () => {
            this.bucket = new GridFSBucket(mongoose.connection.db, {
              bucketName: 'contextFiles'
            });
            resolve();
          });
        });
      }
    } catch (error) {
      console.error('Error initializing GridFS bucket:', error);
    }
  }

  async uploadFile(fileBuffer, filename, metadata = {}) {
    try {
      if (!this.bucket) {
        await this.initBucket();
      }

      const uploadStream = this.bucket.openUploadStream(filename, {
        metadata: metadata
      });

      return new Promise((resolve, reject) => {
        const chunks = [];
        uploadStream.on('data', (chunk) => chunks.push(chunk));
        uploadStream.on('error', reject);
        uploadStream.on('finish', () => {
          resolve(uploadStream.id);
        });

        uploadStream.end(fileBuffer);
      });
    } catch (error) {
      console.error('Error uploading file to GridFS:', error);
      throw error;
    }
  }

  async downloadFile(fileId) {
    try {
      if (!this.bucket) {
        this.initBucket();
      }

      const downloadStream = this.bucket.openDownloadStream(fileId);
      
      return new Promise((resolve, reject) => {
        const chunks = [];
        downloadStream.on('data', (chunk) => chunks.push(chunk));
        downloadStream.on('error', reject);
        downloadStream.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
      });
    } catch (error) {
      console.error('Error downloading file from GridFS:', error);
      throw error;
    }
  }

  async deleteFile(fileId) {
    try {
      if (!this.bucket) {
        this.initBucket();
      }

      await this.bucket.delete(fileId);
    } catch (error) {
      console.error('Error deleting file from GridFS:', error);
      throw error;
    }
  }

  async getFileMetadata(fileId) {
    try {
      if (!this.bucket) {
        this.initBucket();
      }

      const files = await this.bucket.find({ _id: fileId }).toArray();
      return files[0] || null;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }

  async fileExists(fileId) {
    try {
      const metadata = await this.getFileMetadata(fileId);
      return !!metadata;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new GridFSService(); 