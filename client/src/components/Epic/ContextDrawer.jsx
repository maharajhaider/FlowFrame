import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, 
  File, 
  Upload, 
  Plus, 
  Download, 
  Trash2, 
  Edit, 
  ChevronRight, 
  ChevronDown,
  Image as ImageIcon,
  FileText,
  Archive,
  MoreVertical,
  Search,
  Tag,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils.js';
import axios from '@/api/axios.js';

const ContextDrawer = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, message: '' });
  const [currentFolder, setCurrentFolder] = useState('root');
  const [folderStack, setFolderStack] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({});
  const [isAnimating, setIsAnimating] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen, currentFolder]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/context-files/global`, {
        params: { folderId: currentFolder }
      });
      setFiles(response.data);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length, message: 'Preparing file upload...' });
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ 
          current: i, 
          total: files.length, 
          message: `Uploading: ${file.name}` 
        });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('parentFolderId', currentFolder);
        
        await axios.post(`/api/context-files/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
      
      setUploadProgress({ current: files.length, total: files.length, message: 'Upload complete!' });
      loadFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0, message: '' });
      event.target.value = '';
    }
  };

  const handleFolderUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length, message: 'Preparing folder upload...' });
    
    try {
      const fileGroups = {};
      
      files.forEach(file => {
        const pathParts = file.webkitRelativePath.split('/');
        const fileName = pathParts.pop();
        const folderPath = pathParts.join('/');
        
        if (!fileGroups[folderPath]) {
          fileGroups[folderPath] = [];
        }
        fileGroups[folderPath].push(file);
      });

      let totalProcessed = 0;
      const totalFiles = files.length;

      for (const [folderPath, folderFiles] of Object.entries(fileGroups)) {
        setUploadProgress({ 
          current: totalProcessed, 
          total: totalFiles, 
          message: `Creating folder structure: ${folderPath || 'root'}` 
        });

        let currentParentId = currentFolder;
        
        if (folderPath) {
          const folderNames = folderPath.split('/');
          for (const folderName of folderNames) {
            try {
              const folderResponse = await axios.post(`/api/context-files/folder`, {
                name: folderName,
                parentFolderId: currentParentId,
              });
              currentParentId = folderResponse.data._id;
            } catch (error) {
              if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
                const filesResponse = await axios.get(`/api/context-files/global`, {
                  params: { folderId: currentParentId }
                });
                const existingFolder = filesResponse.data.find(f => f.name === folderName && f.isFolder);
                if (existingFolder) {
                  currentParentId = existingFolder._id;
                }
              } else {
                console.error('Error creating folder:', error);
                continue;
              }
            }
          }
        }

        for (const file of folderFiles) {
          setUploadProgress({ 
            current: totalProcessed, 
            total: totalFiles, 
            message: `Uploading: ${file.name}` 
          });

          const formData = new FormData();
          formData.append('file', file);
          formData.append('parentFolderId', currentParentId);
          
          await axios.post(`/api/context-files/upload`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          
          totalProcessed++;
        }
      }
      
      setUploadProgress({ current: totalFiles, total: totalFiles, message: 'Upload complete!' });
      loadFiles();
    } catch (error) {
      console.error('Error uploading folder:', error);
      alert('Error uploading folder. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0, message: '' });
      event.target.value = '';
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await axios.post(`/api/context-files/folder`, {
        name: newFolderName.trim(),
        parentFolderId: currentFolder,
      });
      setNewFolderName('');
      setShowNewFolderModal(false);
      loadFiles();
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Error creating folder. Please try again.');
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await axios.delete(`/api/context-files/${fileId}`);
      loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error deleting file. Please try again.');
    }
  };

  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const response = await axios.get(`/api/context-files/download/${fileId}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file. Please try again.');
    }
  };

  const handleEditFile = async () => {
    try {
      await axios.patch(`/api/context-files/${editData._id}`, {
        name: editData.name,
        description: editData.description,
        tags: editData.tags?.join(',') || '',
      });
      setShowEditModal(false);
      setEditData({});
      loadFiles();
    } catch (error) {
      console.error('Error updating file:', error);
      alert('Error updating file. Please try again.');
    }
  };

  const navigateToFolder = (folderId, folderName) => {
    setCurrentFolder(folderId);
    setFolderStack([...folderStack, { id: folderId, name: folderName }]);
  };

  const navigateBack = (index) => {
    const newStack = folderStack.slice(0, index + 1);
    setFolderStack(newStack);
    setCurrentFolder(newStack[newStack.length - 1]?.id || 'root');
  };

  const getFileIcon = (file) => {
    if (file.isFolder) {
      return <Folder className="w-5 h-5 text-blue-500" />;
    }
    
    if (file.mimeType?.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-green-500" />;
    }
    
    if (file.mimeType === 'application/pdf') {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    
    if (file.mimeType?.includes('zip') || file.mimeType?.includes('archive')) {
      return <Archive className="w-5 h-5 text-purple-500" />;
    }
    
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    } else {
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end " style={{ 
      pointerEvents: isOpen ? 'auto' : 'none',
      display: (!isOpen && !isAnimating) ? 'none' : 'flex'
    }}>
      <div 
        className={`fixed inset-0 transition-all duration-500 ease-out pointer-events-none ${
          isOpen ? 'bg-opacity-30 pointer-events-auto' : 'bg-transparent opacity-0'
        }`}
        onClick={onClose}
        style={{ transitionDelay: isOpen ? '0ms' : '0ms' }}
      />
      
      <div className={`fixed right-0 w-full bg-white border-l border-gray-200 flex flex-col transform transition-all duration-500 ease-out ${
        isOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full shadow-lg'
      }`} style={{ 
        top: '64px', 
        height: 'calc(100vh - 64px)', 
        width: '100vw', 
        zIndex: 40,
        willChange: 'transform',
        transitionDelay: isOpen ? '0ms' : '0ms'
      }}>
        <div className="flex items-center justify-between p-6 border-b bg-white">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">Knowledge Base</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                {files.length} items
              </span>
              {currentFolder !== 'root' && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                  In folder
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-3 border-b bg-white">
          <div className="flex items-center space-x-2 text-sm">
            <button
              onClick={() => {
                setCurrentFolder('root');
                setFolderStack([]);
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              📁 Root
            </button>
            {folderStack.map((folder, index) => (
              <React.Fragment key={folder.id}>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <button
                  onClick={() => navigateBack(index)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  📁 {folder.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search files by name, description, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Upload className="w-5 h-5 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
            <button
              onClick={() => folderInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              title="Upload entire folder with subfolders and files"
            >
              <Folder className="w-5 h-5 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Folder'}
            </button>
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="flex items-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Folder
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip,.json,.csv"
            />
            <input
              ref={folderInputRef}
              type="file"
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFolderUpload}
              className="hidden"
            />
          </div>
        </div>

        {uploading && uploadProgress.total > 0 && (
          <div className="px-6 py-4 border-b bg-blue-50">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900">{uploadProgress.message}</div>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  {uploadProgress.current} of {uploadProgress.total} files processed
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-white" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-lg text-gray-600">Loading files...</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500">
              <Folder className="w-16 h-16 mb-4 text-gray-400" />
              <h3 className="text-xl font-medium mb-2">
                {searchTerm ? 'No files match your search' : 'No files in this folder'}
              </h3>
                            {!searchTerm && (
                <div className="text-gray-400 text-center max-w-md">
                  <p className="mb-2">
                    Upload company documents, policies, and knowledge files to build your organization's knowledge base
                  </p>
                  <p className="text-sm">
                    💡 Tip: Use "Upload Folder" to recursively upload entire folders with their structure
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6">
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="grid grid-cols-12 gap-4 p-4 border-b bg-gray-50 font-medium text-gray-700">
                  <div className="col-span-4">Name</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Size</div>
                  <div className="col-span-2">Modified</div>
                  <div className="col-span-1">Tags</div>
                  <div className="col-span-1">Actions</div>
                </div>
                
                {filteredFiles.map((file) => (
                  <div
                    key={file._id}
                    className={cn(
                      "grid grid-cols-12 gap-4 p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors",
                      selectedFile?._id === file._id && "bg-blue-50 border-blue-200"
                    )}
                    onClick={() => {
                      if (file.isFolder) {
                        navigateToFolder(file._id, file.name);
                      } else {
                        setSelectedFile(file);
                      }
                    }}
                  >
                    <div className="col-span-4 flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {getFileIcon(file)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        {file.description && (
                          <p className="text-xs text-gray-500 truncate">
                            {file.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="col-span-2 flex items-center">
                      <span className="text-sm text-gray-600">
                        {file.isFolder ? 'Folder' : file.mimeType || 'Unknown'}
                      </span>
                    </div>
                    
                    <div className="col-span-2 flex items-center">
                      <span className="text-sm text-gray-600">
                        {file.isFolder ? '-' : formatFileSize(file.size)}
                      </span>
                    </div>
                    
                    <div className="col-span-2 flex items-center">
                      <span className="text-sm text-gray-600">
                        {new Date(file.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="col-span-1 flex items-center">
                      {file.tags?.length > 0 ? (
                        <div className="flex items-center space-x-1">
                          <Tag className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-500">{file.tags.length}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </div>
                    
                    <div className="col-span-1 flex items-center justify-end space-x-1">
                      {!file.isFolder && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFile(file._id, file.originalName);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditData(file);
                          setShowEditModal(true);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(file._id);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showNewFolderModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowNewFolderModal(false)} />
          <div className="relative bg-white rounded-xl p-8 w-96 shadow-2xl">
            <div className="flex items-center mb-6">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Folder className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Create New Folder</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Folder Name</label>
                <input
                  type="text"
                  placeholder="Enter folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  placeholder="Describe what this folder contains"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-xl p-8 w-[500px] shadow-2xl">
            <div className="flex items-center mb-6">
              <div className="p-2 bg-gray-100 rounded-lg mr-3">
                {getFileIcon(editData)}
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Edit File Details</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">File Name</label>
                <input
                  type="text"
                  value={editData.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe the file contents or purpose"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={editData.tags?.join(', ') || ''}
                  onChange={(e) => setEditData({ ...editData, tags: e.target.value.split(',').map(tag => tag.trim()) })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="documentation, api, design, etc."
                />
                <p className="text-xs text-gray-500 mt-1">Tags help with searching and organizing files</p>
              </div>
              {!editData.isFolder && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">File Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="ml-2 text-gray-900">{editData.mimeType || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Size:</span>
                      <span className="ml-2 text-gray-900">{formatFileSize(editData.size)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <span className="ml-2 text-gray-900">{new Date(editData.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Modified:</span>
                      <span className="ml-2 text-gray-900">{new Date(editData.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditFile}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextDrawer; 