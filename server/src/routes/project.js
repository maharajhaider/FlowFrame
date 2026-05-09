const express = require("express");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const { Project } = require("../models/Project");
const Sprint = require("../models/Sprint");
const Feature = require("../models/Feature");
const Task = require("../models/Task");
const User = require("../models/User");

const router = express.Router();

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, sprints = [], features = {}, tasks = {} } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Project name is required" });
    }

    if (!Array.isArray(sprints)) {
      return res.status(400).json({ message: "sprints must be an array" });
    }
    if (typeof features !== "object" || Array.isArray(features)) {
      return res
        .status(400)
        .json({ message: "features must be an object/map" });
    }
    if (typeof tasks !== "object" || Array.isArray(tasks)) {
      return res.status(400).json({ message: "tasks must be an object/map" });
    }

    try {
      let project = await Project.findOne({});

      const createdSprints = {};
      for (let i = 0; i < sprints.length; i++) {
        const sprint = sprints[i];
        const sprintCount = project?.sprintIds?.length + i + 1 || i + 1;
        const sprintId = `sprint-${i + 1}`;

        if (!sprint.title?.trim()) {
          throw new Error(`Sprint at index ${i} is missing a title`);
        }

        const newSprint = new Sprint({
          title: `Sprint ${sprintCount}: ${sprint.title.trim()}`,
          description: sprint.description || "",
          startDate: sprint.startDate || new Date(),
          endDate:
            sprint.endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Default to 2 weeks from now
          state: sprint.state || "future",
          featureIds: [],
        });

        const savedSprint = await newSprint.save();
        createdSprints[sprintId] = savedSprint._id;
      }

      const createdFeatures = {};
      for (const [featureId, feature] of Object.entries(features)) {
        if (!feature.title?.trim()) {
          throw new Error(`Feature ${featureId} is missing a title`);
        }

        let featureSprintId = null;
        for (let i = 0; i < sprints.length; i++) {
          const sprint = sprints[i];
          if (sprint.featureIds && sprint.featureIds.includes(featureId)) {
            featureSprintId = createdSprints[`sprint-${i + 1}`];
            break;
          }
        }

        if (!featureSprintId) {
          throw new Error(`Feature ${featureId} is not assigned to any sprint`);
        }

        const newFeature = new Feature({
          title: feature.title.trim(),
          description: feature.description || "",
          priority: feature.priority || "medium",
          sprintId: featureSprintId,
          taskIds: [],
        });

        const savedFeature = await newFeature.save();
        createdFeatures[featureId] = savedFeature._id;
      }

      const createdTasks = {};
      for (const [taskId, task] of Object.entries(tasks)) {
        if (!task.title?.trim()) {
          throw new Error(`Task ${taskId} is missing a title`);
        }

        let taskSprintId = null;
        if (task.featureId && createdFeatures[task.featureId]) {
          for (let i = 0; i < sprints.length; i++) {
            const sprint = sprints[i];
            if (
              sprint.featureIds &&
              sprint.featureIds.includes(task.featureId)
            ) {
              taskSprintId = createdSprints[`sprint-${i + 1}`];
              break;
            }
          }
        }

        if (!taskSprintId) {
          throw new Error(
            `Task ${taskId} cannot be assigned to a sprint. Make sure its feature is assigned to a sprint.`
          );
        }

        let assigneeId = null;
        if (task.assignee && typeof task.assignee === "string") {
          if (mongoose.Types.ObjectId.isValid(task.assignee)) {
            // Already an ObjectId string
            assigneeId = task.assignee;
          } else {
            // Try to find user by name
            const user = await User.findOne({ name: task.assignee });
            if (user) {
              assigneeId = user._id;
            }
          }
        }

        const taskStatus = task.status || "todo";
        const newTask = new Task({
          title: task.title.trim(),
          description: task.description || "",
          estimatedHours: task.estimatedHours ?? 0,
          inProgressStartTime: taskStatus === "in-progress" ? new Date() : null,
          assignee: assigneeId,
          priority: task.priority || "medium",
          featureId: createdFeatures[task.featureId],
          sprintId: taskSprintId,
          status: taskStatus,
        });

        const savedTask = await newTask.save();
        createdTasks[taskId] = savedTask._id;

        if (createdFeatures[task.featureId]) {
          await Feature.findByIdAndUpdate(createdFeatures[task.featureId], {
            $push: { taskIds: savedTask._id },
          });
        }
      }

      for (let i = 0; i < sprints.length; i++) {
        const sprint = sprints[i];
        const sprintId = `sprint-${i + 1}`;

        const featureObjectIds = (sprint.featureIds || [])
          .map((featureId) => createdFeatures[featureId])
          .filter((id) => id);

        await Sprint.findByIdAndUpdate(createdSprints[sprintId], {
          featureIds: featureObjectIds,
        });
      }

      const projectData = {
        name: name.trim(),
        sprintIds: Object.values(createdSprints),
        featureIds: Object.values(createdFeatures),
        taskIds: Object.values(createdTasks),
      };

      if (!project) {
        project = new Project(projectData);
      } else {
        project.name = projectData.name;
        project.sprintIds = [...project.sprintIds, ...projectData.sprintIds];
        project.featureIds = [...project.featureIds, ...projectData.featureIds];
        project.taskIds = [...project.taskIds, ...projectData.taskIds];
      }

      await project.save();

      const populatedProject = await Project.findById(project._id)
        .populate("sprintIds")
        .populate("featureIds")
        .populate({
          path: "taskIds",
          populate: [
            {
              path: "assignee",
              select: "name email roles",
            },
            {
              path: "comments.author",
              select: "name email",
            },
          ],
        });

      // Convert to plain object and include virtual fields
      const projectWithVirtuals = populatedProject.toObject({ virtuals: true });

      // Ensure taskIds (populated tasks) also include virtual fields
      if (projectWithVirtuals.taskIds) {
        projectWithVirtuals.taskIds = projectWithVirtuals.taskIds.map(
          (task) => {
            if (task && typeof task.toObject === "function") {
              return task.toObject({ virtuals: true });
            }
            return task;
          }
        );
      }

      res.status(201).json(projectWithVirtuals);
    } catch (err) {
      console.error(err);
      if (err.message) {
        return res.status(400).json({ message: err.message });
      }
      res.status(500).json({ message: "Unexpected error" });
    }
  })
);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const project = await Project.findOne({})
      .populate("sprintIds")
      .populate("featureIds")
      .populate({
        path: "taskIds",
        populate: [
          {
            path: "assignee",
            select: "name email roles",
          },
          {
            path: "comments.author",
            select: "name email",
          },
        ],
      });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Convert to plain object and include virtual fields
    const projectWithVirtuals = project.toObject({ virtuals: true });

    // Ensure taskIds (populated tasks) also include virtual fields
    if (projectWithVirtuals.taskIds) {
      projectWithVirtuals.taskIds = projectWithVirtuals.taskIds.map((task) => {
        if (task && typeof task.toObject === "function") {
          return task.toObject({ virtuals: true });
        }
        return task;
      });
    }

    res.status(200).json(projectWithVirtuals);
  })
);

router.patch(
  "/sprints/:sprintId/start",
  asyncHandler(async (req, res) => {
    const { sprintId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sprintId)) {
      return res.status(400).json({ message: "Invalid sprint ID" });
    }

    try {
      // Complete any currently active sprint
      await Sprint.updateMany({ state: "active" }, { state: "completed" });

      // Start the selected sprint
      const sprint = await Sprint.findByIdAndUpdate(
        sprintId,
        {
          state: "active",
          startDate: new Date(), // Update start date to now
        },
        { new: true }
      );

      if (!sprint) {
        return res.status(404).json({ message: "Sprint not found" });
      }

      res.status(200).json(sprint);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to start sprint" });
    }
  })
);

router.patch(
  "/sprints/:sprintId/complete",
  asyncHandler(async (req, res) => {
    const { sprintId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sprintId)) {
      return res.status(400).json({ message: "Invalid sprint ID" });
    }

    try {
      const sprint = await Sprint.findByIdAndUpdate(
        sprintId,
        {
          state: "completed",
          endDate: new Date(), // Update end date to now
        },
        { new: true }
      );

      if (!sprint) {
        return res.status(404).json({ message: "Sprint not found" });
      }

      res.status(200).json(sprint);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to complete sprint" });
    }
  })
);

// Migration route to fix existing sprints without state
router.patch(
  "/migrate-sprints",
  asyncHandler(async (req, res) => {
    try {
      // Update all sprints that don't have a state to 'future'
      const result = await Sprint.updateMany(
        { state: { $exists: false } },
        { state: "future" }
      );

      res.status(200).json({
        message: `Updated ${result.modifiedCount} sprints to 'future' state`,
        modifiedCount: result.modifiedCount,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to migrate sprints" });
    }
  })
);

module.exports = router;
