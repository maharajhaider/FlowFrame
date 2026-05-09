const express = require("express");
const sinon = require("sinon");
const { expect } = require("chai");
const request = require("supertest");
const proxyquire = require("proxyquire").noCallThru();
const mongoose = require("mongoose");

// Mock LLM task generator service
// Note: The actual LLM service now supports three providers: OpenAI, Gemini, and Together AI
// Set LLM_PROVIDER=openai (requires OPENAI_API_KEY), LLM_PROVIDER=gemini (requires GEMINI_API_KEY), or LLM_PROVIDER=together
// Default fallback is Together AI if other provider keys are not provided
const llmServiceStub = {
  generateSprintStructure: sinon.stub()
};

// Mock embedding service
const embeddingServiceStub = sinon.stub();

// Create test apps with different stub configurations
const routerSuccess = proxyquire("../../src/routes/llm", {
  "../services/llmtaskGenerator": llmServiceStub
});

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use("/api/llm", routerSuccess);

// Import models for integration testing
const User = require("../../src/models/User");
const Sprint = require("../../src/models/Sprint");
const Feature = require("../../src/models/Feature");
const Task = require("../../src/models/Task");
const { Project } = require("../../src/models/Project");

describe("LLM Task Generation Integration Tests", function () {
  let testUsers;

  beforeEach(async () => {
    // Reset all stubs
    llmServiceStub.generateSprintStructure.reset();
    
    // Clean database
    await mongoose.connection.db.dropDatabase();

    // Create test users for assignment context
    testUsers = await User.create([
      {
        name: "Frontend Developer",
        email: "frontend@test.com",
        password: "password123",
        roles: ["developer"],
        skills: ["React", "JavaScript", "CSS", "HTML"],
        experience_level: "senior",
        current_workload: 2,
        max_capacity: 8,
        availability: true
      },
      {
        name: "Backend Developer", 
        email: "backend@test.com",
        password: "password123",
        roles: ["developer"],
        skills: ["Node.js", "Express", "MongoDB", "REST APIs"],
        experience_level: "mid",
        current_workload: 1,
        max_capacity: 8,
        availability: true
      },
      {
        name: "Full Stack Developer",
        email: "fullstack@test.com", 
        password: "password123",
        roles: ["developer"],
        skills: ["React", "Node.js", "JavaScript", "MongoDB"],
        experience_level: "senior",
        current_workload: 3,
        max_capacity: 8,
        availability: true
      }
    ]);
  });


  describe("Successful LLM Generation", () => {
    it("generates sprint structure with valid data format", async () => {
      const mockSprintData = {
        sprints: [
          {
            title: "Authentication & User Management Sprint",
            description: "Implement user authentication system with login, registration, and profile management",
            featureIds: ["feature-1", "feature-2"]
          },
          {
            title: "Core Dashboard Sprint", 
            description: "Build main dashboard with data visualization and user interface",
            featureIds: ["feature-3"]
          }
        ],
        features: {
          "feature-1": {
            title: "User Authentication",
            description: "Login, registration, and password management",
            priority: "high",
            taskIds: ["task-1", "task-2", "task-3"]
          },
          "feature-2": {
            title: "User Profile Management",
            description: "User profile editing and preferences",
            priority: "medium", 
            taskIds: ["task-4", "task-5"]
          },
          "feature-3": {
            title: "Dashboard Interface",
            description: "Main dashboard with charts and widgets",
            priority: "high",
            taskIds: ["task-6", "task-7", "task-8"]
          }
        },
        tasks: {
          "task-1": {
            title: "Implement login API endpoint",
            description: "Create secure login endpoint with JWT authentication",
            estimatedHours: 8,
            priority: "high",
            featureId: "feature-1"
          },
          "task-2": {
            title: "Build login form component",
            description: "React component for user login with validation",
            estimatedHours: 6,
            priority: "high", 
            featureId: "feature-1"
          },
          "task-3": {
            title: "Setup password encryption",
            description: "Implement bcrypt for secure password hashing",
            estimatedHours: 4,
            priority: "high",
            featureId: "feature-1"
          },
          "task-4": {
            title: "Create user profile API",
            description: "CRUD operations for user profile data",
            estimatedHours: 6,
            priority: "medium",
            featureId: "feature-2"
          },
          "task-5": {
            title: "Build profile edit form",
            description: "React form for editing user profile information",
            estimatedHours: 5,
            priority: "medium",
            featureId: "feature-2"
          },
          "task-6": {
            title: "Design dashboard layout",
            description: "Create responsive dashboard layout with sidebar",
            estimatedHours: 8,
            priority: "high",
            featureId: "feature-3"
          },
          "task-7": {
            title: "Implement data visualization",
            description: "Add charts and graphs using Chart.js",
            estimatedHours: 10,
            priority: "high",
            featureId: "feature-3"
          },
          "task-8": {
            title: "Add dashboard widgets",
            description: "Create reusable widget components",
            estimatedHours: 7,
            priority: "medium",
            featureId: "feature-3"
          }
        }
      };

      llmServiceStub.generateSprintStructure.resolves(mockSprintData);

      const res = await request(app)
        .post("/api/llm/generate-sprint")
        .send({ prompt: "Build a user authentication system with dashboard" });

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('sprints');
      expect(res.body).to.have.property('features'); 
      expect(res.body).to.have.property('tasks');

      // Verify sprint structure
      expect(res.body.sprints).to.be.an('array').with.length(2);
      expect(res.body.sprints[0]).to.have.all.keys(['title', 'description', 'featureIds']);

      // Verify features structure
      expect(res.body.features).to.be.an('object');
      expect(Object.keys(res.body.features)).to.have.length(3);
      expect(res.body.features['feature-1']).to.have.all.keys(['title', 'description', 'priority', 'taskIds']);

      // Verify tasks structure
      expect(res.body.tasks).to.be.an('object');
      expect(Object.keys(res.body.tasks)).to.have.length(8);
      expect(res.body.tasks['task-1']).to.have.all.keys(['title', 'description', 'estimatedHours', 'priority', 'featureId']);

      // Verify LLM service was called correctly
      expect(llmServiceStub.generateSprintStructure.calledOnce).to.be.true;
      const callArgs = llmServiceStub.generateSprintStructure.firstCall.args;
      expect(callArgs[0]).to.equal("Build a user authentication system with dashboard");
      expect(callArgs[1]).to.be.an('array'); // attachments array
    });
  });

  describe("Data Validation and Consistency", () => {
    it("validates generated sprint-feature-task relationships", async () => {
      const mockSprintData = {
        sprints: [
          {
            title: "Sprint 1",
            description: "First sprint",
            featureIds: ["feature-1", "feature-2"]
          }
        ],
        features: {
          "feature-1": {
            title: "Feature 1",
            description: "First feature",
            priority: "high",
            taskIds: ["task-1", "task-2"]
          },
          "feature-2": {
            title: "Feature 2", 
            description: "Second feature",
            priority: "medium",
            taskIds: ["task-3"]
          }
        },
        tasks: {
          "task-1": {
            title: "Task 1",
            description: "First task",
            estimatedHours: 5,
            priority: "high",
            featureId: "feature-1"
          },
          "task-2": {
            title: "Task 2",
            description: "Second task", 
            estimatedHours: 3,
            priority: "medium",
            featureId: "feature-1"
          },
          "task-3": {
            title: "Task 3",
            description: "Third task",
            estimatedHours: 8,
            priority: "high",
            featureId: "feature-2"
          }
        }
      };

      llmServiceStub.generateSprintStructure.resolves(mockSprintData);

      const res = await request(app)
        .post("/api/llm/generate-sprint")
        .send({ prompt: "Create well-structured sprint" });

      expect(res.status).to.equal(200);

      // Validate sprint-feature relationships
      const sprint = res.body.sprints[0];
      sprint.featureIds.forEach(featureId => {
        expect(res.body.features).to.have.property(featureId);
      });

      // Validate feature-task relationships
      Object.entries(res.body.features).forEach(([featureId, feature]) => {
        feature.taskIds.forEach(taskId => {
          expect(res.body.tasks).to.have.property(taskId);
          expect(res.body.tasks[taskId].featureId).to.equal(featureId);
        });
      });
    });

    it("ensures all required fields are present in generated data", async () => {
      const mockSprintData = {
        sprints: [
          {
            title: "Complete Sprint",
            description: "Fully specified sprint",
            featureIds: ["feature-complete"]
          }
        ],
        features: {
          "feature-complete": {
            title: "Complete Feature",
            description: "Fully specified feature",
            priority: "high",
            taskIds: ["task-complete"]
          }
        },
        tasks: {
          "task-complete": {
            title: "Complete Task",
            description: "Fully specified task",
            estimatedHours: 6,
            priority: "medium",
            featureId: "feature-complete"
          }
        }
      };

      llmServiceStub.generateSprintStructure.resolves(mockSprintData);

      const res = await request(app)
        .post("/api/llm/generate-sprint")
        .send({ prompt: "Generate complete sprint structure" });

    expect(res.status).to.equal(200);

      // Validate all sprints have required fields
      res.body.sprints.forEach(sprint => {
        expect(sprint.title).to.be.a('string').that.is.not.empty;
        expect(sprint.description).to.be.a('string');
        expect(sprint.featureIds).to.be.an('array');
      });

      // Validate all features have required fields
      Object.values(res.body.features).forEach(feature => {
        expect(feature.title).to.be.a('string').that.is.not.empty;
        expect(feature.description).to.be.a('string');
        expect(feature.priority).to.be.oneOf(['high', 'medium', 'low']);
        expect(feature.taskIds).to.be.an('array');
      });

      // Validate all tasks have required fields
      Object.values(res.body.tasks).forEach(task => {
        expect(task.title).to.be.a('string').that.is.not.empty;
        expect(task.description).to.be.a('string');
        expect(task.estimatedHours).to.be.a('number').that.is.at.least(0);
        expect(task.priority).to.be.oneOf(['high', 'medium', 'low']);
        expect(task.featureId).to.be.a('string').that.is.not.empty;
      });
    });
  });

  describe("Performance and Scalability", () => {
    it("handles large prompt input efficiently", async () => {
      const largePrompt = "Build a comprehensive enterprise application with ".repeat(100) + 
        "user management, reporting, analytics, file storage, real-time notifications, " +
        "payment processing, audit logging, and multi-tenant architecture.";

      const mockSprintData = {
        sprints: [{ title: "Large Sprint", description: "Large", featureIds: ["feature-1"] }],
        features: { "feature-1": { title: "Feature", description: "Feature", priority: "medium", taskIds: ["task-1"] }},
        tasks: { "task-1": { title: "Task", description: "Task", estimatedHours: 4, priority: "medium", featureId: "feature-1" }}
      };

      llmServiceStub.generateSprintStructure.resolves(mockSprintData);

      const startTime = Date.now();
      const res = await request(app)
        .post("/api/llm/generate-sprint")
        .send({ prompt: largePrompt });
      const endTime = Date.now();

      expect(res.status).to.equal(200);
      expect(endTime - startTime).to.be.lessThan(5000); // Should complete within 5 seconds
      expect(llmServiceStub.generateSprintStructure.calledOnce).to.be.true;
    });

    it("handles complex sprint structure generation", async () => {
      // Mock generation of large sprint structure
      const complexSprintData = {
        sprints: Array.from({ length: 5 }, (_, i) => ({
          title: `Sprint ${i + 1}`,
          description: `Sprint ${i + 1} description`,
          featureIds: [`feature-${i + 1}-1`, `feature-${i + 1}-2`]
        })),
        features: {},
        tasks: {}
      };

      // Generate features and tasks
      for (let sprintIdx = 1; sprintIdx <= 5; sprintIdx++) {
        for (let featureIdx = 1; featureIdx <= 2; featureIdx++) {
          const featureId = `feature-${sprintIdx}-${featureIdx}`;
          complexSprintData.features[featureId] = {
            title: `Feature ${sprintIdx}-${featureIdx}`,
            description: `Feature description`,
            priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
            taskIds: [`task-${sprintIdx}-${featureIdx}-1`, `task-${sprintIdx}-${featureIdx}-2`, `task-${sprintIdx}-${featureIdx}-3`]
          };

          for (let taskIdx = 1; taskIdx <= 3; taskIdx++) {
            const taskId = `task-${sprintIdx}-${featureIdx}-${taskIdx}`;
            complexSprintData.tasks[taskId] = {
              title: `Task ${sprintIdx}-${featureIdx}-${taskIdx}`,
              description: `Task description`,
              estimatedHours: Math.floor(Math.random() * 12) + 1,
              priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
              featureId: featureId
            };
          }
        }
      }

      llmServiceStub.generateSprintStructure.resolves(complexSprintData);

      const res = await request(app)
        .post("/api/llm/generate-sprint")
        .send({ prompt: "Generate complex multi-sprint project structure" });

      expect(res.status).to.equal(200);
      expect(res.body.sprints).to.have.length(5);
      expect(Object.keys(res.body.features)).to.have.length(10);
      expect(Object.keys(res.body.tasks)).to.have.length(30);
    });
  });
});
