const express = require("express");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const multer = require("multer");
const Task = require("../models/Task");
const Feature = require("../models/Feature");
const Sprint = require("../models/Sprint");
const { Project } = require("../models/Project");
const { requireAuth, requireEditPermission } = require("../utils/auth");
const { sanitizeBody } = require("../utils/sanitization");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain', 'text/csv', 'text/html',
      'application/json', 'application/xml',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});
const User = require("../models/User");
const mlService = require("../services/mlService");

const router = express.Router();

router.post(
  "/",
  requireAuth,
  requireEditPermission,
  sanitizeBody(["title", "description"]),
  asyncHandler(async (req, res) => {
    const {
      title,
      description = "",
      estimatedHours = 0,
      assignee = null,
      priority = "medium",
      status = "todo",
      featureId,
      sprintId,
    } = req.body;

    if (!featureId || !sprintId)
      return res
        .status(400)
        .json({ message: "featureId and sprintId are required" });
    if (!title?.trim())
      return res.status(400).json({ message: "title is required" });

    const [feature, sprint] = await Promise.all([
      Feature.findById(featureId),
      Sprint.findById(sprintId),
    ]);

    if (!feature) return res.status(404).json({ message: "Feature not found" });
    /*
     * if (!sprint) return res.status(404).json({ message: 'Sprint not found' });

    if (!feature.sprintId.equals(sprint._id)) {
      return res.status(400).json({
        message: 'featureId does not belong to the supplied sprintId',
      });
    }
*/
    const task = await Task.create({
      title: title.trim(),
      description,
      estimatedHours,
      inProgressStartTime: status === "in-progress" ? new Date() : null,
      assignee,
      priority,
      status,
      featureId,
      sprintId,
    });

    await Feature.findByIdAndUpdate(featureId, {
      $addToSet: { taskIds: task._id },
    });

    await Project.findOneAndUpdate({}, { $addToSet: { taskIds: task._id } });

    res.status(201).json(task);
  })
);

router.put(
  "/:taskId",
  requireAuth,
  requireEditPermission,
  sanitizeBody(["title", "description"]),
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const {
      title = task.title,
      description = task.description,
      estimatedHours = task.estimatedHours,
      assignee = task.assignee,
      priority = task.priority,
      status = task.status,
      featureId = task.featureId.toString(),
      sprintId = task.sprintId.toString(),
    } = req.body;

    let newFeature = null;
    let newSprint = null;

    if (
      featureId !== task.featureId.toString() ||
      sprintId !== task.sprintId.toString()
    ) {
      [newFeature, newSprint] = await Promise.all([
        Feature.findById(featureId),
        Sprint.findById(sprintId),
      ]);
      if (!newFeature)
        return res.status(404).json({ message: "Feature not found" });
      if (!newSprint)
        return res.status(404).json({ message: "Sprint not found" });
      if (!newFeature.sprintId.equals(newSprint._id)) {
        return res.status(400).json({
          message: "featureId does not belong to the supplied sprintId",
        });
      }
    }

    try {
      const updateData = {
        title: title.trim(),
        description,
        estimatedHours,
        assignee,
        priority,
        status,
        featureId,
        sprintId,
      };

      // Track when work starts
      if (status !== task.status && status === "in-progress") {
        updateData.inProgressStartTime = new Date();
      }

      const updatedTask = await Task.findByIdAndUpdate(
        taskId,
        updateData,
        { new: true }
      );

      if (featureId !== task.featureId.toString()) {
        await Feature.findByIdAndUpdate(
          task.featureId,
          { $pull: { taskIds: task._id } }
        );
        await Feature.findByIdAndUpdate(
          featureId,
          { $addToSet: { taskIds: task._id } }
        );
      }

      res.json(updatedTask);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  })
);

router.delete(
  "/:taskId",
  requireAuth,
  requireEditPermission,
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    try {
      await Feature.findByIdAndUpdate(
        task.featureId,
        { $pull: { taskIds: task._id } }
      );

      const { Project } = require("../models/Project");
      await Project.findOneAndUpdate(
        {},
        { $pull: { taskIds: task._id } }
      );

      await Task.deleteOne({ _id: task._id });

      res.json({ message: "Task deleted" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  })
);

router.patch(
  "/:taskId/status",
  requireAuth,
  requireEditPermission,
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: "Invalid task ID format" });
    }

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    if (!["todo", "in-progress", "done"].includes(status)) {
      return res.status(400).json({
        message: "Status must be one of: todo, in-progress, done",
      });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status === status) {
      return res.json(task);
    }

    const updateData = { status };

    // Track when work starts
    if (status === "in-progress") {
      updateData.inProgressStartTime = new Date();
    }

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      updateData,
      { new: true }
    );

    res.json(updatedTask);
  })
);

/**
 * POST /api/tasks/:taskId/assign
 * Body JSON:
 * {
 *   auto: true,           // Use ML assignment
 *   userId?: string       // Optional manual override
 *   taskData?: object     // For AI-generated tasks not yet in DB
 * }
 */
router.post(
  '/:taskId/assign',
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { auto = true, userId = null, taskData = null } = req.body;

    console.log(`🎯 Assignment request for task ${taskId}, auto: ${auto}, userId: ${userId}`);

    // Find the task - handle both database tasks (ObjectId) and AI-generated tasks (UUID)
    let task = null;
    let isAITask = false;
    
    // First try to find in database
    try {
      if (taskId.match(/^[0-9a-fA-F]{24}$/)) {
        // Valid ObjectId format - try database lookup
        task = await Task.findById(taskId);
      }
    } catch (error) {
      console.log(`Failed to find task ${taskId} in database:`, error.message);
    }
    
    // If not found in database, this might be an AI-generated task
    if (!task) {
      if (taskData) {
        // Use the task data provided by frontend for AI-generated tasks
        isAITask = true;
        task = {
          _id: taskId,
          id: taskId,
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority || 'medium',
          estimatedHours: taskData.estimatedHours || 0,
          assignee: taskData.assignee || null,
          status: taskData.status || 'todo',
          featureId: taskData.featureId,
          sprintId: taskData.sprintId,
          save: async function() {
            // Mock save function for AI tasks - they don't get saved to DB yet
            console.log(`AI task ${this.title} assigned to ${this.assignee} (not saved to DB)`);
            return this;
          }
        };
        console.log(`📋 Using AI-generated task: "${task.title}"`);
      } else {
        return res.status(404).json({ 
          success: false,
          message: 'Task not found. For AI-generated tasks, please provide taskData in request body.' 
        });
      }
    } else {
      console.log(`📋 Found database task: "${task.title}"`);
    }
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    console.log(`📋 Found task: "${task.title}", current assignee: "${task.assignee}"`);

    // Manual assignment override
    if (!auto && userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update task assignment - use name instead of email
      const previousAssignee = task.assignee;
      const assigneeName = user.name || user.email;
      task.assignee = assigneeName;
      await task.save();

      // Update user workload
      user.current_workload = (user.current_workload || 0) + (task.estimatedHours || 0);
      await user.save();

      console.log(`✅ Task "${task.title}" manually assigned from "${previousAssignee}" to "${assigneeName}"`);

      return res.json({
        success: true,
        message: `Task assigned manually to ${assigneeName}`,
        assignment: {
          userId: user._id.toString(),
          userName: user.name || user.email,
          userEmail: user.email,
          confidence: 1.0,
          reasoning: { method: 'manual', reason: 'Manually assigned by user' },
        },
        task: {
          id: task._id.toString(),
          title: task.title,
          description: task.description,
          assignee: task.assignee,
          priority: task.priority,
          estimatedHours: task.estimatedHours,
          status: task.status,
        },
        previousAssignee: previousAssignee,
      });
    }

    // ML-based assignment
    try {
      // Get all team members
      const teamMembers = await User.find({}).select(
        'name email skills roles current_workload max_capacity availability experience_level past_issues_solved'
      );

      if (teamMembers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No team members available for assignment',
        });
      }

      // Transform task data for ML service
      const taskForML = {
        id: task._id.toString(),
        title: task.title,
        description: task.description,
        priority: task.priority,
        estimated_hours: task.estimatedHours,
        feature_id: task.featureId?.toString(),
        sprint_id: task.sprintId?.toString(),
      };

      // Call ML service
      const mlResult = await mlService.assignTask(taskForML, teamMembers);

      if (!mlResult.success) {
        return res.status(400).json(mlResult);
      }

      // Update task assignment
      const assignedUser = await User.findById(mlResult.assignment.userId);
      if (!assignedUser) {
        // Fallback case: if user not found in DB but ML service returned assignment,
        // use the name/email from ML response directly
        console.log(`⚠️ User ${mlResult.assignment.userId} not found in database, using ML response data`);
        
        const previousAssignee = task.assignee;
        task.assignee = mlResult.assignment.userName || mlResult.assignment.userEmail;
        await task.save();

        console.log(`✅ Task "${task.title}" ML-assigned from "${previousAssignee}" to ${task.assignee} (fallback)`);

        return res.json({
          success: true,
          message: mlResult.message,
          assignment: mlResult.assignment,
          alternatives: mlResult.alternatives,
          task: {
            id: task._id?.toString() || task.id,
            title: task.title,
            description: task.description,
            assignee: task.assignee,
            priority: task.priority,
            estimatedHours: task.estimatedHours,
            status: task.status,
          },
          previousAssignee: previousAssignee,
          isAITask: isAITask,
        });
      }

      // Store previous assignee for logging
      const previousAssignee = task.assignee;
      
      // Update task assignee to user name (with email fallback if name not set)
      const assigneeName = assignedUser.name || assignedUser.email;
      task.assignee = assigneeName;
      await task.save();

      // Update user workload - but only for database tasks, not AI tasks
      const workloadIncrease = task.estimatedHours || 0;
      const savePromises = [];
      
      if (!isAITask && workloadIncrease > 0) {
        // Only update workload for database tasks
        assignedUser.current_workload = (assignedUser.current_workload || 0) + workloadIncrease;
        savePromises.push(assignedUser.save());
        savePromises.push(mlService.updateUserWorkload(mlResult.assignment.userId, workloadIncrease));
      }

      // Save changes
      await Promise.all(savePromises);

      const taskType = isAITask ? 'AI-generated' : 'database';
      console.log(`✅ Task "${task.title}" ML-assigned from "${previousAssignee}" to ${assigneeName} (confidence: ${mlResult.assignment.confidence}, type: ${taskType})`);

      return res.json({
        success: true,
        message: mlResult.message,
        assignment: mlResult.assignment,
        alternatives: mlResult.alternatives,
        task: {
          id: task._id?.toString() || task.id,
          title: task.title,
          description: task.description,
          assignee: task.assignee,
          priority: task.priority,
          estimatedHours: task.estimatedHours,
          status: task.status,
        },
        previousAssignee: previousAssignee,
        isAITask: isAITask,
      });

    } catch (error) {
      console.error('❌ Assignment error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during assignment',
        error: error.message,
      });
    }
  })
);

/**
 * GET /api/tasks/ml/health
 * Check ML service health status
 */
router.get(
  '/ml/health',
  asyncHandler(async (req, res) => {
    try {
      const healthStatus = await mlService.healthCheck();
      
      return res.json({
        success: true,
        ml_service: healthStatus,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      return res.status(500).json({
        success: false,
        ml_service: {
          available: false,
          error: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
    })
);

router.post(
  "/:taskId/attachments",
  requireAuth,
  requireEditPermission,
  upload.array('files', 10),
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const attachments = files.map(file => ({
      name: file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      data: file.buffer,
      uploadedBy: req.user?._id || null,
    }));

    task.attachments.push(...attachments);
    await task.save();

    const attachmentInfo = task.attachments.slice(-attachments.length).map(att => ({
      _id: att._id,
      name: att.name,
      originalName: att.originalName,
      mimeType: att.mimeType,
      size: att.size,
      uploadedBy: att.uploadedBy,
      createdAt: att.createdAt,
      updatedAt: att.updatedAt,
    }));

    res.status(201).json(attachmentInfo);
  })
);

router.get(
  "/:taskId/attachments",
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const attachments = task.attachments.map(att => ({
      _id: att._id,
      name: att.name,
      originalName: att.originalName,
      mimeType: att.mimeType,
      size: att.size,
      uploadedBy: att.uploadedBy,
      createdAt: att.createdAt,
      updatedAt: att.updatedAt,
    }));

    res.json(attachments);
  })
);

router.get(
  "/:taskId/attachments/:attachmentId",
  asyncHandler(async (req, res) => {
    const { taskId, attachmentId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `attachment; filename="${attachment.originalName}"`,
      'Content-Length': attachment.size,
    });

    res.send(attachment.data);
  })
);

router.delete(
  "/:taskId/attachments/:attachmentId",
  requireAuth,
  requireEditPermission,
  asyncHandler(async (req, res) => {
    const { taskId, attachmentId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    task.attachments.pull(attachmentId);
    await task.save();

    res.json({ message: "Attachment deleted" });
  })
);

// Comments routes
router.post(
  "/:taskId/comments",
  requireAuth,
  requireEditPermission,
  sanitizeBody(["text"]),
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const newComment = {
      text: text.trim(),
      author: req.user._id,
    };

    // Clean up any existing comments with null authors
    task.comments = task.comments.filter(comment => comment.author !== null);
    
    task.comments.push(newComment);
    await task.save();

    // Populate the author information for the new comment
    const populatedTask = await Task.findById(taskId).populate({
      path: "comments.author",
      select: "name email"
    });

    const addedComment = populatedTask.comments[populatedTask.comments.length - 1];

    res.status(201).json(addedComment);
  })
);

router.get(
  "/:taskId/comments",
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;

    const task = await Task.findById(taskId).populate({
      path: "comments.author",
      select: "name email"
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Filter out comments with null authors to avoid validation errors
    const validComments = task.comments.filter(comment => comment.author !== null);
    res.json(validComments);
  })
);

router.delete(
  "/:taskId/comments/:commentId",
  requireAuth,
  requireEditPermission,
  asyncHandler(async (req, res) => {
    const { taskId, commentId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const comment = task.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Optional: Check if user is authorized to delete this comment
    // if (comment.author.toString() !== req.user?._id?.toString()) {
    //   return res.status(403).json({ message: "Not authorized to delete this comment" });
    // }

    task.comments.pull(commentId);
    await task.save();

    res.json({ message: "Comment deleted" });
  })
);

module.exports = router;
