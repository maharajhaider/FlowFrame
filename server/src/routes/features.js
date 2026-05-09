const express = require('express');
const asyncHandler = require('express-async-handler');
const Feature = require('../models/Feature');
const Sprint = require('../models/Sprint');
const { Project } = require('../models/Project');

const router = express.Router();

// POST /api/features - Create new feature
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, description = '', priority = 'medium', sprintId } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (!sprintId) {
      return res.status(400).json({ message: 'sprintId is required' });
    }

    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found' });
    }

    const feature = await Feature.create({
      title: title.trim(),
      description,
      priority,
      sprintId,
      taskIds: [],
    });

    await Sprint.findByIdAndUpdate(sprintId, {
      $addToSet: { featureIds: feature._id }
    });

    await Project.findOneAndUpdate(
      {},
      { $addToSet: { featureIds: feature._id } }
    );

    res.status(201).json(feature);
  })
);

module.exports = router;
