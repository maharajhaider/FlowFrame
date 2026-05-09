const { expect } = require("chai");
const request = require("supertest");
const mongoose = require("mongoose");

const app = require("./app.test");

const { Project } = require("../../src/models/Project");
const Sprint = require("../../src/models/Sprint");
const Feature = require("../../src/models/Feature");
const Task = require("../../src/models/Task");

describe("Project API router", function () {
  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  describe("POST /api/project", () => {
    it("creates a project with sprints, features and tasks", async () => {
      const payload = {
        name: "FlowFrame",
        sprints: [
          { title: "Sprint 1", description: "First", featureIds: ["F1"] },
          { title: "Sprint 2", description: "Second", featureIds: ["F2"] },
        ],
        features: {
          F1: { title: "Auth feature", priority: "high" },
          F2: { title: "Billing feature", priority: "medium" },
        },
        tasks: {
          T1: { title: "Login page", featureId: "F1" },
          T2: { title: "Payment gateway", featureId: "F2" },
        },
      };

      const res = await request(app).post("/api/project").send(payload);
      expect(res.status).to.equal(201);
      expect(res.body.name).to.equal("FlowFrame");
      expect(res.body.sprintIds.length).to.equal(2);
      expect(res.body.featureIds.length).to.equal(2);
      expect(res.body.taskIds.length).to.equal(2);

      const sprintCount = await Sprint.countDocuments();
      const featureCount = await Feature.countDocuments();
      const taskCount = await Task.countDocuments();
      const projectCount = await Project.countDocuments();

      expect(sprintCount).to.equal(2);
      expect(featureCount).to.equal(2);
      expect(taskCount).to.equal(2);
      expect(projectCount).to.equal(1);
    });

    it("rejects when name is missing", async () => {
      const res = await request(app).post("/api/project").send({ name: "   " });
      expect(res.status).to.equal(400);
    });

    it("preserves existing project data when adding new items", async () => {
      // First, create a project with initial data
      const initialPayload = {
        name: "FlowFrame",
        sprints: [
          { title: "Sprint 1", description: "First", featureIds: ["F1"] },
        ],
        features: {
          F1: { title: "Auth feature", priority: "high" },
        },
        tasks: {
          T1: { title: "Login page", featureId: "F1" },
        },
      };

      const firstRes = await request(app).post("/api/project").send(initialPayload);
      expect(firstRes.status).to.equal(201);
      expect(firstRes.body.sprintIds.length).to.equal(1);
      expect(firstRes.body.featureIds.length).to.equal(1);
      expect(firstRes.body.taskIds.length).to.equal(1);

      // Now add more items to the existing project
      const additionalPayload = {
        name: "FlowFrame Updated",
        sprints: [
          { title: "Sprint 2", description: "Second", featureIds: ["F2"] },
        ],
        features: {
          F2: { title: "Billing feature", priority: "medium" },
        },
        tasks: {
          T2: { title: "Payment gateway", featureId: "F2" },
        },
      };

      const secondRes = await request(app).post("/api/project").send(additionalPayload);
      expect(secondRes.status).to.equal(201);
      expect(secondRes.body.name).to.equal("FlowFrame Updated");
      
      // Verify that the new items are appended to existing ones
      expect(secondRes.body.sprintIds.length).to.equal(2);
      expect(secondRes.body.featureIds.length).to.equal(2);
      expect(secondRes.body.taskIds.length).to.equal(2);

      // Verify database counts
      const sprintCount = await Sprint.countDocuments();
      const featureCount = await Feature.countDocuments();
      const taskCount = await Task.countDocuments();
      const projectCount = await Project.countDocuments();

      expect(sprintCount).to.equal(2);
      expect(featureCount).to.equal(2);
      expect(taskCount).to.equal(2);
      expect(projectCount).to.equal(1); // Still only one project
    });

    it("preserves existing project data when name is updated", async () => {
      // Create initial project
      const initialPayload = {
        name: "Original Name",
        sprints: [
          { title: "Sprint 1", description: "First", featureIds: ["F1"] },
        ],
        features: {
          F1: { title: "Auth feature", priority: "high" },
        },
        tasks: {
          T1: { title: "Login page", featureId: "F1" },
        },
      };

      await request(app).post("/api/project").send(initialPayload);

      // Update project name while adding new items
      const updatePayload = {
        name: "Updated Name",
        sprints: [
          { title: "Sprint 2", description: "Second", featureIds: ["F2"] },
        ],
        features: {
          F2: { title: "Dashboard feature", priority: "medium" },
        },
        tasks: {
          T2: { title: "Dashboard UI", featureId: "F2" },
        },
      };

      const res = await request(app).post("/api/project").send(updatePayload);
      expect(res.status).to.equal(201);
      expect(res.body.name).to.equal("Updated Name");
      expect(res.body.sprintIds.length).to.equal(2);
      expect(res.body.featureIds.length).to.equal(2);
      expect(res.body.taskIds.length).to.equal(2);
    });

    it("handles multiple updates to the same project", async () => {
      // Create initial project
      const initialPayload = {
        name: "Test Project",
        sprints: [
          { title: "Sprint 1", description: "First", featureIds: ["F1"] },
        ],
        features: {
          F1: { title: "Feature 1", priority: "high" },
        },
        tasks: {
          T1: { title: "Task 1", featureId: "F1" },
        },
      };

      await request(app).post("/api/project").send(initialPayload);

      // First update
      const firstUpdatePayload = {
        name: "Test Project",
        sprints: [
          { title: "Sprint 2", description: "Second", featureIds: ["F2"] },
        ],
        features: {
          F2: { title: "Feature 2", priority: "medium" },
        },
        tasks: {
          T2: { title: "Task 2", featureId: "F2" },
        },
      };

      const firstUpdateRes = await request(app).post("/api/project").send(firstUpdatePayload);
      expect(firstUpdateRes.body.sprintIds.length).to.equal(2);
      expect(firstUpdateRes.body.featureIds.length).to.equal(2);
      expect(firstUpdateRes.body.taskIds.length).to.equal(2);

      // Second update
      const secondUpdatePayload = {
        name: "Test Project",
        sprints: [
          { title: "Sprint 3", description: "Third", featureIds: ["F3"] },
        ],
        features: {
          F3: { title: "Feature 3", priority: "low" },
        },
        tasks: {
          T3: { title: "Task 3", featureId: "F3" },
        },
      };

      const secondUpdateRes = await request(app).post("/api/project").send(secondUpdatePayload);
      expect(secondUpdateRes.body.sprintIds.length).to.equal(3);
      expect(secondUpdateRes.body.featureIds.length).to.equal(3);
      expect(secondUpdateRes.body.taskIds.length).to.equal(3);

      // Verify database counts
      const sprintCount = await Sprint.countDocuments();
      const featureCount = await Feature.countDocuments();
      const taskCount = await Task.countDocuments();
      const projectCount = await Project.countDocuments();

      expect(sprintCount).to.equal(3);
      expect(featureCount).to.equal(3);
      expect(taskCount).to.equal(3);
      expect(projectCount).to.equal(1);
    });
  });

  describe("GET /api/project", () => {
    it("returns the project", async () => {
      const payload = { name: "Sample", sprints: [], features: {}, tasks: {} };
      await request(app).post("/api/project").send(payload);

      const res = await request(app).get("/api/project");
      expect(res.status).to.equal(200);
      expect(res.body.name).to.equal("Sample");
    });

    it("returns 404 when project not found", async () => {
      const res = await request(app).get("/api/project");
      expect(res.status).to.equal(404);
    });
  });
});
