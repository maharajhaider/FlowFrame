const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const contextFileSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    originalName: { type: String, required: true },
    fileType: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    gridFSFileId: { type: Types.ObjectId },
    base64Data: { type: String },
    path: { type: String },
    thumbnail: { type: String },

    uploadedBy: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isFolder: { type: Boolean, default: false },
    parentFolderId: {
      type: Types.ObjectId,
      ref: 'ContextFile',
      default: null,
    },
    folderPath: { type: String, default: '/' },
    tags: [{ type: String, trim: true }],
    description: { type: String, default: '' },
    storageMethod: {
      type: String,
      enum: ['gridfs', 'base64', 'local'],
      default: 'gridfs'
    }
  },
  { timestamps: true }
);

contextFileSchema.index({ parentFolderId: 1 });
contextFileSchema.index({ folderPath: 1 });
contextFileSchema.index({ gridFSFileId: 1 });

module.exports = mongoose.model('ContextFile', contextFileSchema); 