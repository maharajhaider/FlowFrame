const express = require("express");
const asyncHandler = require("express-async-handler");
const UserInteraction = require("../models/UserInteraction");
const { requireAuth } = require("../utils/auth");
const mongoose = require("mongoose");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { limit = 50, interactionType } = req.query;

    const query = { userId };
    if (interactionType) {
      query.interactionType = interactionType;
    }

    const interactions = await UserInteraction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("taskId", "title status priority")
      .lean();

    res.json(interactions);
  })
);

router.get(
  "/worked-on",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { limit = 10 } = req.query;

    const workedOnTasks = await UserInteraction.aggregate([
      { $match: { 
        userId: userId,
        interactionType: { $ne: "viewed" }
      } },
      {
        $group: {
          _id: "$taskId",
          lastInteraction: { $first: "$$ROOT" }
        }
      },
      { $sort: { "lastInteraction.createdAt": -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "tasks",
          localField: "_id",
          foreignField: "_id",
          as: "task"
        }
      },
      { $unwind: "$task" },
      {
        $project: {
          taskId: "$_id",
          task: 1,
          lastInteraction: 1
        }
      }
    ]);

    res.json(workedOnTasks);
  })
);

router.get(
  "/viewed",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { limit = 10 } = req.query;

    const viewedTasks = await UserInteraction.find({
      userId,
      interactionType: "viewed"
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("taskId", "title status priority")
      .lean();

    res.json(viewedTasks);
  })
);

router.get(
  "/counts",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const [workedOnCount, viewedCount] = await Promise.all([
      UserInteraction.aggregate([
        { $match: { 
          userId: userId,
          interactionType: { $ne: "viewed" }
        } },
        { $group: { _id: "$taskId" } },
        { $count: "total" }
      ]),
      UserInteraction.aggregate([
        { $match: { userId: userId, interactionType: "viewed" } },
        { $group: { _id: "$taskId" } },
        { $count: "total" }
      ])
    ]);

    res.json({
      workedOn: workedOnCount[0]?.total || 0,
      viewed: viewedCount[0]?.total || 0
    });
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { taskId, interactionType, interactionData, previousValue, newValue } = req.body;

    if (!taskId || !interactionType) {
      return res.status(400).json({ message: "taskId and interactionType are required" });
    }

    const interaction = await UserInteraction.create({
      userId,
      taskId,
      interactionType,
      interactionData: interactionData || {},
      previousValue,
      newValue
    });

    res.status(201).json(interaction);
  })
);

router.delete(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { interactionType } = req.query;

    const query = { userId };
    if (interactionType) {
      query.interactionType = interactionType;
    }

    await UserInteraction.deleteMany(query);

    res.json({ message: "Interaction history cleared successfully" });
  })
);

module.exports = router; 