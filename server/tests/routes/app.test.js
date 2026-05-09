const express = require("express");
const tasksRouter = require("../../src/routes/tasks");
const projectRouter = require("../../src/routes/project");
const featuresRouter = require("../../src/routes/features");

const app = express();
app.use(express.json());
app.use("/api/tasks", tasksRouter);
app.use("/api/project", projectRouter);
app.use("/api/features", featuresRouter);

module.exports = app;
