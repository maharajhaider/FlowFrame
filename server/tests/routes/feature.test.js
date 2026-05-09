const { expect } = require("chai");
const request = require("supertest");
const mongoose = require("mongoose");

const app = require("./app.test");
const Feature = require("../../src/models/Feature");
const Sprint = require("../../src/models/Sprint");
const { Project } = require("../../src/models/Project");

describe("Features API router", function () {
  let sprint, project;

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
    sprint = await Sprint.create({
      title: "Sprint A",
      startDate: new Date(),
      endDate: new Date(),
      description: "",
    });
    project = await Project.create({
      name: "Demo",
      sprintIds: [sprint._id],
      featureIds: [],
      taskIds: [],
    });
  });

  describe("POST /api/features", () => {
    it("creates a feature and links it to sprint & project", async () => {
      const res = await request(app)
        .post("/api/features")
        .send({ title: "Feature X", sprintId: sprint._id.toString() });

      expect(res.status).to.equal(201);
      expect(res.body.title).to.equal("Feature X");

      const sprintAfter = await Sprint.findById(sprint._id);
      const projectAfter = await Project.findById(project._id);

      expect(sprintAfter.featureIds.map(String)).to.include(res.body._id);
      expect(projectAfter.featureIds.map(String)).to.include(res.body._id);
    });

    it("rejects when title is missing", async () => {
      const res = await request(app)
        .post("/api/features")
        .send({ sprintId: sprint._id.toString() });
      expect(res.status).to.equal(400);
    });

    it("rejects when sprint not found", async () => {
      const res = await request(app).post("/api/features").send({
        title: "Invalid",
        sprintId: new mongoose.Types.ObjectId().toString(),
      });
      expect(res.status).to.equal(404);
    });
  });
});
