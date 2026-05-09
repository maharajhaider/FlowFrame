const express = require('express');
const mongoose = require('mongoose');
const Sprint = require('../models/Sprint');
const Feature = require('../models/Feature');
const Task = require('../models/Task');

const router = express.Router();

router.get('/dummy', (req, res) => {
    console.log('Generating dummy data. 2..');

    // Base start date (e.g., May 15, 2025)
    const baseDate = new Date('2025-05-15');

    // Create sprints with 2-week intervals
    const sprints = Array.from({ length: 3 }, (_, si) => {
        const startDate = new Date(baseDate);
        startDate.setDate(startDate.getDate() + si * 14);

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 13); // 2-week sprint (14 days inclusive)

        const sprint = new Sprint({
            _id: new mongoose.Types.ObjectId(),
            title: `Dummy Sprint ${si + 1}`,
            description: 'Generated dummy sprint.',
            featureIds: [],
        });

        sprint.startDate = startDate;
        sprint.endDate = endDate;
        return sprint;
    });

    // Create 2 features per sprint
    const features = sprints.flatMap((sprint, si) =>
        Array.from({ length: 2 }, (_, fi) => {
            const feature = new Feature({
                _id: new mongoose.Types.ObjectId(),
                title: `Dummy Feature ${si * 2 + fi + 1}`,
                description: 'Generated dummy feature.',
                priority: 'medium',
                sprintId: sprint._id,
                taskIds: [],
            });
            sprint.featureIds.push(feature._id);
            return feature;
        })
    );

    const tasks = Array.from({ length: 5 }, (_, ti) => {
        const feature = features[ti % features.length];
        const sprint = sprints.find(s => String(s._id) === String(feature.sprintId));

        const task = new Task({
            _id: new mongoose.Types.ObjectId(),
            title: `Dummy Task ${ti + 1}`,
            description: 'Generated dummy task.',
            estimatedHours: (ti % 3) + 1,
            assignee: 'Elma',
            priority: 'low',
            status: 'todo',
            featureId: feature._id,
            sprintId: sprint._id,
        });

        feature.taskIds.push(task._id);
        return task;
    });

    const formatDate = date => date.toISOString().split('T')[0];

    const sprintsObj = Object.fromEntries(
        sprints.map(s => [
            s._id,
            {
                id: s._id.toString(),
                title: s.title,
                description: s.description,
                featureIds: s.featureIds.map(id => id.toString()),
                startDate: formatDate(s.startDate),
                endDate: formatDate(s.endDate),
            },
        ])
    );

    const featuresObj = Object.fromEntries(
        features.map(f => [
            f._id,
            {
                id: f._id.toString(),
                title: f.title,
                description: f.description,
                priority: f.priority,
                sprintId: f.sprintId.toString(),
                taskIds: f.taskIds.map(id => id.toString()),
            },
        ])
    );

    const tasksObj = Object.fromEntries(
        tasks.map(t => [
            t._id,
            {
                id: t._id.toString(),
                title: t.title,
                description: t.description,
                estimatedHours: t.estimatedHours,
                assignee: t.assignee,
                priority: t.priority,
                status: t.status,
                featureId: t.featureId.toString(),
                sprintId: t.sprintId.toString(),
            },
        ])
    );

    res.json({ sprints: sprintsObj, features: featuresObj, tasks: tasksObj });
});

module.exports = router;