import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchProjectData, updateTask, uploadAttachments, fetchAttachments, deleteAttachment, addComment, fetchComments, deleteComment } from '../redux/slices/projectSlice';
import { fetchUsers } from '../redux/slices/userSlice';
import { ArrowLeft, Calendar, User, Tag, Clock, MessageSquare, Paperclip, Edit3, Save, X, Upload, File, Image, FileText } from 'lucide-react';
import { canCurrentUserEdit } from '../utils/permissions';
import { interactionService } from '../services/interactionService';

const TaskDetail = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const projectState = useSelector((state) => state.project) || {};
  const { data, loading, error } = projectState;
  const { tasks, features, sprints } = data || {};
  
  const userState = useSelector((state) => state.users) || {};
  const { data: users } = userState;
  const { user } = userState;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(null);
  const [comment, setComment] = useState('');
  const [showAttachmentUpload, setShowAttachmentUpload] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);

  const tasksArray = tasks ? Object.values(tasks) : [];
  const featuresArray = features ? Object.values(features) : [];
  const sprintsArray = sprints ? Object.values(sprints) : [];
  const usersArray = users || [];

  const task = tasksArray.find(t => t._id === taskId);
  const feature = task ? featuresArray.find(f => f._id === task.featureId) : null;
  const sprint = task ? sprintsArray.find(s => s._id === task.sprintId) : null;
  // Handle assignee - could be a populated object or a string ID
  const assignee = task ? (() => {
    if (!task.assignee) return null;
    
    // If assignee is a populated object with _id, find the user by that _id
    if (typeof task.assignee === 'object' && task.assignee._id) {
      return usersArray.find(u => u._id === task.assignee._id);
    }
    
    // If assignee is a string ID, find the user by that ID
    if (typeof task.assignee === 'string') {
      return usersArray.find(u => u._id === task.assignee);
    }
    
    return null;
  })() : null;
  const attachments = task?.attachments || [];

  useEffect(() => {
    dispatch(fetchProjectData());
    dispatch(fetchUsers());
  }, [dispatch]);

  useEffect(() => {
    const trackView = async () => {
      if (task && task._id) {
        dispatch(fetchAttachments(task._id));
        dispatch(fetchComments(task._id));
        
        try {
          await interactionService.recordInteraction(task._id, 'viewed', {
            title: task.title,
            status: task.status,
            priority: task.priority
          });
        } catch (error) {
          console.error('Failed to record view interaction:', error);
        }
      }
    };
    
    trackView();
  }, [dispatch, task?._id]);

  useEffect(() => {
    if (task) {
      // Extract assignee ID from populated object or use as-is if it's already a string
      const assigneeId = task.assignee ? 
        (typeof task.assignee === 'object' && task.assignee._id ? task.assignee._id : task.assignee) : 
        '';
      
      setEditedTask({ 
        ...task, 
        assignee: assigneeId 
      });
    }
  }, [task]);

  const handleSave = async () => {
    if (editedTask) {
      try {
        await dispatch(updateTask(editedTask)).unwrap();
        
        try {
          await interactionService.recordInteraction(task._id, 'task_updated', {
            field: 'task_details',
            changes: 'Task details modified'
          });
        } catch (error) {
          console.error('Failed to record task update interaction:', error);
        }
        
        setIsEditing(false);
      } catch (error) {
        console.error('Failed to update task:', error);
      }
    }
  };

  const handleCancel = () => {
    setEditedTask({ ...task });
    setIsEditing(false);
  };

  const handleAddComment = async () => {
    if (comment.trim() && task?._id) {
      try {
        await dispatch(addComment({ taskId: task._id, text: comment })).unwrap();
        
        try {
          await interactionService.recordInteraction(task._id, 'comment_added', {
            commentLength: comment.length,
            commentPreview: comment.substring(0, 50) + (comment.length > 50 ? '...' : '')
          });
        } catch (error) {
          console.error('Failed to record comment interaction:', error);
        }
        
        setComment('');
      } catch (error) {
        console.error('Failed to add comment:', error);
        alert('Failed to add comment. Please try again.');
      }
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      await dispatch(uploadAttachments({ taskId: task._id, files })).unwrap();
      
              try {
          await interactionService.recordInteraction(task._id, 'file_uploaded', {
            fileCount: files.length,
            fileNames: files.map(f => f.name),
            totalSize: files.reduce((sum, f) => sum + f.size, 0)
          });
        } catch (error) {
          console.error('Failed to record file upload interaction:', error);
        }
      
      setShowAttachmentUpload(false);
    } catch (error) {
      console.error('Failed to upload attachments:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <Image size={16} />;
    if (fileType.includes('pdf')) return <FileText size={16} />;
    return <File size={16} />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handlePreviewFile = (attachment) => {
    setPreviewFile(attachment);
    setShowPreview(true);
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewFile(null);
  };

  const isPreviewable = (fileType) => {
    return fileType.startsWith('image/') || 
           fileType.includes('pdf') || 
           fileType.includes('text/') ||
           fileType.includes('json') ||
           fileType.includes('xml') ||
           fileType.includes('csv');
  };

  const renderPreview = (attachment) => {
    if (attachment.mimeType.startsWith('image/')) {
      return (
        <img 
          src={`/api/tasks/${task._id}/attachments/${attachment._id}`}
          alt={attachment.name}
          className="max-w-full max-h-full object-contain"
        />
      );
    } else if (attachment.mimeType.includes('pdf')) {
      return (
        <iframe
          src={`/api/tasks/${task._id}/attachments/${attachment._id}`}
          className="w-full h-full"
          title={attachment.name}
        />
      );
    } else if (attachment.mimeType.startsWith('text/') || attachment.mimeType.includes('json') || attachment.mimeType.includes('xml') || attachment.mimeType.includes('csv')) {
      return (
        <div className="w-full h-full bg-gray-50 p-4 overflow-auto">
          <pre className="text-sm text-gray-800 whitespace-pre-wrap">
            {/* Text content would be loaded here */}
            <div className="text-center text-gray-500 py-8">
              <FileText size={48} className="mx-auto mb-4" />
              <p>Text preview not available</p>
              <p className="text-sm">Download to view content</p>
            </div>
          </pre>
        </div>
      );
    }
    return (
      <div className="text-center text-gray-500 py-8">
        <File size={48} className="mx-auto mb-4" />
        <p>Preview not available</p>
        <p className="text-sm">Download to view content</p>
      </div>
    );
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'done': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Task not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex h-screen">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-8">
            {/* Task Header */}
            <div className="mb-8">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTask?.title || ''}
                      onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                      className="w-full text-3xl font-bold text-gray-900 bg-white/80 backdrop-blur-sm border-0 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    />
                  ) : (
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{task.title}</h1>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="font-mono">#{task._id.slice(-8)}</span>
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    <span>{feature?.title || 'No Feature'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-6">
                  {canCurrentUserEdit() && (
                    <>
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                          >
                            <Save size={16} />
                            Save
                          </button>
                          <button
                            onClick={handleCancel}
                            className="flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm text-gray-700 rounded-xl hover:bg-white transition-all duration-200 shadow-sm"
                          >
                            <X size={16} />
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm text-gray-700 rounded-xl hover:bg-white transition-all duration-200 shadow-sm"
                        >
                          <Edit3 size={16} />
                          Edit
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Task Description */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 p-8 mb-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  Description
                </h2>
                {canCurrentUserEdit() && (
                  <button
                    onClick={() => setShowAttachmentUpload(!showAttachmentUpload)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <Paperclip size={16} />
                    Attach files
                  </button>
                )}
              </div>

              {/* Attachment Upload */}
              {showAttachmentUpload && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600 mb-3">Uploading files...</p>
                      </>
                    ) : (
                      <>
                        <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600 mb-3">Drop files here or click to upload</p>
                        <input
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                          <Upload size={16} />
                          Choose Files
                        </label>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Attachments List */}
              {attachments.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Attachments</h3>
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div key={attachment._id} className="flex items-center gap-3 p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                        <div className="text-gray-500">
                          {getFileIcon(attachment.mimeType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(attachment.size)} • {new Date(attachment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isPreviewable(attachment.mimeType) && (
                            <button
                              onClick={() => handlePreviewFile(attachment)}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Preview"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = `/api/tasks/${task._id}/attachments/${attachment._id}`;
                              a.download = attachment.name;
                              a.click();
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Download"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this attachment?')) {
                                try {
                                  await dispatch(deleteAttachment({ taskId: task._id, attachmentId: attachment._id })).unwrap();
                                } catch (error) {
                                  console.error('Failed to delete attachment:', error);
                                  alert('Failed to delete attachment. Please try again.');
                                }
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isEditing ? (
                <textarea
                  value={editedTask?.description || ''}
                  onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                  rows={8}
                  className="w-full bg-white/50 backdrop-blur-sm border-0 rounded-xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-sm"
                  placeholder="Add a description..."
                />
              ) : (
                <div className="text-gray-700 whitespace-pre-wrap text-lg leading-relaxed">
                  {task.description || 'No description provided.'}
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 p-8 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <MessageSquare size={16} className="text-green-600" />
                </div>
                Comments
              </h2>
              
              {/* Add Comment */}
              {canCurrentUserEdit() && (
                <div className="mb-8">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={4}
                    className="w-full bg-white/50 backdrop-blur-sm border-0 rounded-xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-sm"
                  />
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={handleAddComment}
                      disabled={!comment.trim()}
                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Add Comment
                    </button>
                  </div>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-6">
                {task?.comments?.map((comment) => (
                  <div key={comment._id} className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border-l-4 border-green-500">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-green-600">
                          {comment.author?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{comment.author?.name || 'Unknown'}</span>
                        <div className="text-sm text-gray-500">
                          {new Date(comment.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-gray-700">{comment.text}</div>
                  </div>
                ))}
                {(!task?.comments || task.comments.length === 0) && (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-lg">No comments yet</p>
                    <p className="text-sm">Be the first to add one!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-4">Task Details</h3>
            
            <div className="space-y-6">
              {/* Status */}
              <div className="border-b border-gray-100 pb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Status
                </label>
                {isEditing ? (
                  <select
                    value={editedTask?.status || 'todo'}
                    onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value })}
                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${getStatusColor(editedTask?.status || 'todo')}`}
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                ) : (
                  <span className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${getStatusColor(task.status)}`}>
                    {task.status === 'todo' ? 'To Do' : task.status === 'in-progress' ? 'In Progress' : 'Done'}
                  </span>
                )}
              </div>

              {/* Priority */}
              <div className="border-b border-gray-100 pb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Priority
                </label>
                {isEditing ? (
                  <select
                    value={editedTask?.priority || 'medium'}
                    onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value })}
                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${getPriorityColor(editedTask?.priority || 'medium')}`}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                ) : (
                  <span className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                )}
              </div>

              {/* Assignee */}
              <div className="border-b border-gray-100 pb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Assignee
                </label>
                {isEditing ? (
                  <select
                    value={editedTask?.assignee || ''}
                    onChange={(e) => setEditedTask({ ...editedTask, assignee: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {usersArray.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-3">
                    {assignee ? (
                      <>
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {assignee.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm text-gray-900">{assignee.name}</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">Unassigned</span>
                    )}
                  </div>
                )}
              </div>

              {/* Feature */}
              <div className="border-b border-gray-100 pb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Feature
                </label>
                <div className="text-sm text-gray-900">
                  {feature?.title || 'No Feature'}
                </div>
              </div>

              {/* Sprint */}
              <div className="border-b border-gray-100 pb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Sprint
                </label>
                <div className="text-sm text-gray-900">
                  {sprint?.title || 'Backlog'}
                </div>
              </div>

              {/* Estimated Hours */}
              <div className="border-b border-gray-100 pb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Estimated Hours
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedTask?.estimatedHours || 0}
                    onChange={(e) => setEditedTask({ ...editedTask, estimatedHours: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                ) : (
                  <div className="text-sm text-gray-900">
                    {task.estimatedHours || 0} hours
                  </div>
                )}
              </div>

              {/* Actual Hours */}
              <div className="border-b border-gray-100 pb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Actual Hours
                </label>
                <div className="text-sm text-gray-900">
                  {task.actualHours && 
                    `${Math.floor(task.actualHours)}h ${Math.floor(task.actualHours % 60 * 60)}m`
                    
                  }
                </div>
              </div>

              {/* Created Date */}
              <div className="border-b border-gray-100 pb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Created
                </label>
                <div className="text-sm text-gray-900">
                  {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Unknown'}
                </div>
              </div>

              {/* Last Updated */}
              <div className="border-b border-gray-100 pb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Last Updated
                </label>
                <div className="text-sm text-gray-900">
                  {task.updatedAt ? new Date(task.updatedAt).toLocaleDateString() : 'Unknown'}
                </div>
              </div>

              {/* Attachments Count */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Attachments
                </label>
                <div className="text-sm text-gray-900">
                  {attachments.length} file{attachments.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      {showPreview && previewFile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl max-h-[90vh] w-full flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="text-gray-500">
                  {getFileIcon(previewFile.mimeType)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{previewFile.name}</h3>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(previewFile.size)} • {new Date(previewFile.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = `/api/tasks/${task._id}/attachments/${previewFile._id}`;
                    a.download = previewFile.name;
                    a.click();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Download"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                <button
                  onClick={closePreview}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-hidden">
              {renderPreview(previewFile)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetail;