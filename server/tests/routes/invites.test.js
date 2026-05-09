const express = require("express");
const sinon = require("sinon");
const { expect } = require("chai");
const request = require("supertest");
const mongoose = require("mongoose");
const proxyquire = require("proxyquire").noCallThru();

const User = require("../../src/models/User");
const Invite = require("../../src/models/Invite");

const emailStub = sinon.stub().resolves(true);

const requireAuthStub = (req, res, next) => {
  const id = req.headers["x-test-user-id"];
  if (id) {
    req.user = { id };
    next();
  } else {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

const invitesRouter = proxyquire("../../src/routes/invites", {
  "../utils/email": { sendInvitationEmail: emailStub },
  "../utils/auth": { requireAuth: requireAuthStub },
});

sinon.stub(User.prototype, "isProjectManager").returns(true);

const app = express();
app.use(express.json());
app.use("/api/invites", invitesRouter);

describe("Invites API router", function () {
  let pmUser;

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
    emailStub.resetHistory();
    pmUser = await User.create({
      email: "pm@example.com",
      password: "dummypass", // ≥ 6 chars
      name: "Project Manager",
      roles: ["project_manager"],
    });
  });

  describe("POST /api/invites", () => {
    it("creates an invite and sends email", async () => {
      const res = await request(app)
        .post("/api/invites")
        .set("x-test-user-id", pmUser._id.toString())
        .send({ email: "dev@example.com", role: "developer" });

      expect(res.status).to.equal(201);
      expect(emailStub.calledOnce).to.be.true;
      expect(await Invite.countDocuments()).to.equal(1);
    });

    it("rejects when user already exists", async () => {
      await User.create({
        email: "exists@example.com",
        password: "dummypass", // ≥ 6 chars
        name: "Existing",
        roles: ["user"],
      });

      const res = await request(app)
        .post("/api/invites")
        .set("x-test-user-id", pmUser._id.toString())
        .send({ email: "exists@example.com", role: "developer" });

      expect(res.status).to.equal(409);
    });
  });

  describe("GET /api/invites", () => {
    it("lists invites sent by current PM", async () => {
      const invite = new Invite({
        email: "designer@example.com",
        role: "designer",
        invitedBy: pmUser._id,
      });
      invite.generateToken();
      await invite.save();

      const res = await request(app)
        .get("/api/invites")
        .set("x-test-user-id", pmUser._id.toString());

      expect(res.status).to.equal(200);
      expect(res.body).to.have.lengthOf(1);
      expect(res.body[0].email).to.equal("designer@example.com");
    });
  });

  describe("GET /api/invites/:token", () => {
    it("validates a token and returns invite info", async () => {
      const invite = new Invite({
        email: "tester@example.com",
        role: "tester",
        invitedBy: pmUser._id,
      });
      invite.generateToken();
      await invite.save();

      const res = await request(app).get(`/api/invites/${invite.token}`);
      expect(res.status).to.equal(200);
      expect(res.body.email).to.equal("tester@example.com");
    });
  });

  describe("DELETE /api/invites/:id", () => {
    it("cancels an unused invite", async () => {
      const invite = new Invite({
        email: "cancelme@example.com",
        role: "developer",
        invitedBy: pmUser._id,
      });
      invite.generateToken();
      await invite.save();

      const res = await request(app)
        .delete(`/api/invites/${invite._id}`)
        .set("x-test-user-id", pmUser._id.toString());

      expect(res.status).to.equal(200);
      expect(await Invite.countDocuments()).to.equal(0);
    });
  });
});
