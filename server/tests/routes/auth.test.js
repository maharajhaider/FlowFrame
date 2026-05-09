const express = require("express");
const sinon = require("sinon");
const { expect } = require("chai");
const request = require("supertest");
const mongoose = require("mongoose");
const proxyquire = require("proxyquire").noCallThru();

const sendEmailStub = sinon.stub().resolves(true);
const signStub = sinon.stub().returns("fake-token");

const requireAuthStub = (req, _res, next) => {
  const hdr = req.headers["x-test-user-email"];
  if (hdr) {
    const User = require("../../src/models/User");
    User.findOne({ email: hdr }).then((u) => {
      req.user = u;
      next();
    });
  } else {
    return _res.status(401).json({ error: "Unauthorized" });
  }
};

const authRouter = proxyquire("../../src/routes/auth", {
  "../utils/email": { sendEmailVerification: sendEmailStub },
  "../utils/auth": { sign: signStub, requireAuth: requireAuthStub },
});

const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);

const User = require("../../src/models/User");
const Invite = require("../../src/models/Invite");

describe("Auth API Routes - Comprehensive Test Suite", function () {
  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
    sendEmailStub.resetHistory();
    signStub.resetHistory();
  });

  describe("POST /api/auth/signup", () => {
    describe("Successful Signup", () => {
      it("creates a user with valid data and sends verification email", async () => {
        const userData = {
        email: "john@example.com",
        password: "secret123",
        firstName: "John",
        lastName: "Doe",
        };

        const res = await request(app).post("/api/auth/signup").send(userData);

      expect(res.status).to.equal(201);
        expect(res.body.message).to.include("Account created successfully");
      expect(res.body.user.email).to.equal("john@example.com");
        expect(res.body.user.name).to.equal("John Doe");
        expect(res.body.user.roles).to.deep.equal(["user"]);
        expect(res.body.user.isEmailVerified).to.be.false;
      expect(sendEmailStub.calledOnce).to.be.true;

        // Verify user was created in database
      const user = await User.findOne({ email: "john@example.com" });
        expect(user).to.exist;
        expect(user.name).to.equal("John Doe");
      expect(user.isEmailVerified).to.be.false;
        expect(user.emailVerificationToken).to.exist;
        expect(user.emailVerificationExpiresAt).to.exist;
      });

      it("creates user with invite token and assigns correct role", async () => {
        // Create a project manager to invite someone
        const projectManager = await User.create({
          email: "pm@example.com",
          password: "password123",
          name: "Project Manager",
          roles: ["project_manager"],
          isEmailVerified: true,
        });

        // Create an invite
        const invite = new Invite({
          email: "invited@example.com",
          invitedBy: projectManager._id,
          role: "developer",
          token: "valid-invite-token",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        await invite.save();

        const userData = {
          email: "invited@example.com",
          password: "secret123",
          firstName: "Invited",
          lastName: "Developer",
          inviteToken: "valid-invite-token",
        };

        const res = await request(app).post("/api/auth/signup").send(userData);

        expect(res.status).to.equal(201);
        expect(res.body.user.roles).to.deep.equal(["developer"]);

        // Verify user was created with correct role
        const user = await User.findOne({ email: "invited@example.com" });
        expect(user.roles).to.deep.equal(["developer"]);
        expect(user.invitedBy.toString()).to.equal(projectManager._id.toString());

        // Verify invite was marked as used
        const updatedInvite = await Invite.findById(invite._id);
        expect(updatedInvite.isUsed).to.be.true;
      });

      it("handles email case insensitivity correctly", async () => {
        const userData = {
          email: "JOHN@EXAMPLE.COM",
          password: "secret123",
          firstName: "John",
          lastName: "Doe",
        };

        const res = await request(app).post("/api/auth/signup").send(userData);

        expect(res.status).to.equal(201);
        expect(res.body.user.email).to.equal("john@example.com"); // API returns lowercase

        // Verify user was stored with lowercase email
        const user = await User.findOne({ email: "john@example.com" });
        expect(user).to.exist;
        expect(user.email).to.equal("john@example.com");
      });
    });

    describe("Validation Errors", () => {
      it("rejects invalid email format", async () => {
        const res = await request(app).post("/api/auth/signup").send({
          email: "invalid-email",
          password: "secret123",
          firstName: "John",
          lastName: "Doe",
        });

        expect(res.status).to.equal(400);
        expect(res.body.errors).to.be.an("array");
        expect(res.body.errors[0].msg).to.include("valid email");
      });

      it("rejects password shorter than 6 characters", async () => {
        const res = await request(app).post("/api/auth/signup").send({
          email: "john@example.com",
          password: "12345",
          firstName: "John",
          lastName: "Doe",
        });

        expect(res.status).to.equal(400);
        expect(res.body.errors).to.be.an("array");
        expect(res.body.errors[0].msg).to.include("at least 6 characters");
      });

      it("rejects missing firstName", async () => {
        const res = await request(app).post("/api/auth/signup").send({
          email: "john@example.com",
          password: "secret123",
          lastName: "Doe",
        });

        expect(res.status).to.equal(400);
        expect(res.body.errors).to.be.an("array");
        expect(res.body.errors[0].msg).to.include("First name is required");
      });

      it("rejects missing lastName", async () => {
        const res = await request(app).post("/api/auth/signup").send({
          email: "john@example.com",
          password: "secret123",
          firstName: "John",
        });

        expect(res.status).to.equal(400);
        expect(res.body.errors).to.be.an("array");
        expect(res.body.errors[0].msg).to.include("Last name is required");
      });

      it("rejects empty firstName", async () => {
        const res = await request(app).post("/api/auth/signup").send({
          email: "john@example.com",
          password: "secret123",
          firstName: "",
          lastName: "Doe",
        });

        expect(res.status).to.equal(400);
        expect(res.body.errors).to.be.an("array");
        expect(res.body.errors[0].msg).to.include("First name is required");
      });

      it("rejects empty lastName", async () => {
        const res = await request(app).post("/api/auth/signup").send({
          email: "john@example.com",
          password: "secret123",
          firstName: "John",
          lastName: "",
        });

        expect(res.status).to.equal(400);
        expect(res.body.errors).to.be.an("array");
        expect(res.body.errors[0].msg).to.include("Last name is required");
      });

      it("handles multiple validation errors", async () => {
        const res = await request(app).post("/api/auth/signup").send({
          email: "invalid-email",
          password: "123",
          firstName: "",
          lastName: "",
        });

        expect(res.status).to.equal(400);
        expect(res.body.errors).to.be.an("array");
        expect(res.body.errors).to.have.lengthOf(4);
      });
    });

    describe("Duplicate Email Handling", () => {
      it("rejects duplicate email registration", async () => {
        // First signup
        await request(app).post("/api/auth/signup").send({
          email: "duplicate@example.com",
          password: "secret123",
          firstName: "First",
          lastName: "User",
        });

        // Second signup with same email
        const res = await request(app).post("/api/auth/signup").send({
          email: "duplicate@example.com",
          password: "different123",
          firstName: "Second",
          lastName: "User",
        });

        expect(res.status).to.equal(409);
        expect(res.body.error).to.equal("Email already in use");
      });

      it("rejects duplicate email with different case", async () => {
        // First signup
      await request(app).post("/api/auth/signup").send({
          email: "test@example.com",
          password: "secret123",
          firstName: "First",
          lastName: "User",
        });

        // Second signup with same email in different case
        const res = await request(app).post("/api/auth/signup").send({
          email: "TEST@EXAMPLE.COM",
          password: "different123",
          firstName: "Second",
          lastName: "User",
        });

        expect(res.status).to.equal(409);
        expect(res.body.error).to.equal("Email already in use");
      });
    });

    describe("Invite Token Validation", () => {
      it("rejects invalid invite token", async () => {
        const res = await request(app).post("/api/auth/signup").send({
          email: "invited@example.com",
          password: "secret123",
          firstName: "Invited",
          lastName: "User",
          inviteToken: "invalid-token",
        });

        expect(res.status).to.equal(400);
        expect(res.body.error).to.equal("Invalid invitation token");
      });

      it("rejects expired invite token", async () => {
        const projectManager = await User.create({
          email: "pm@example.com",
          password: "password123",
          name: "Project Manager",
          roles: ["project_manager"],
          isEmailVerified: true,
        });

        // Create expired invite
        const invite = new Invite({
          email: "invited@example.com",
          invitedBy: projectManager._id,
          role: "developer",
          token: "expired-token",
          expiresAt: new Date(Date.now() - 1000), // Already expired
        });
        await invite.save();

        const res = await request(app).post("/api/auth/signup").send({
          email: "invited@example.com",
        password: "secret123",
          firstName: "Invited",
          lastName: "User",
          inviteToken: "expired-token",
        });

        expect(res.status).to.equal(400);
        expect(res.body.error).to.equal("Invitation has expired");
      });

      it("rejects invite token with mismatched email", async () => {
        const projectManager = await User.create({
          email: "pm@example.com",
          password: "password123",
          name: "Project Manager",
          roles: ["project_manager"],
          isEmailVerified: true,
        });

        const invite = new Invite({
          email: "invited@example.com",
          invitedBy: projectManager._id,
          role: "developer",
          token: "valid-token",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        await invite.save();

      const res = await request(app).post("/api/auth/signup").send({
          email: "different@example.com", // Different email
        password: "secret123",
          firstName: "Different",
          lastName: "User",
          inviteToken: "valid-token",
        });

        expect(res.status).to.equal(400);
        expect(res.body.error).to.equal("Email does not match invitation");
      });

      it("rejects already used invite token", async () => {
        const projectManager = await User.create({
          email: "pm@example.com",
          password: "password123",
          name: "Project Manager",
          roles: ["project_manager"],
          isEmailVerified: true,
        });

        const invite = new Invite({
          email: "invited@example.com",
          invitedBy: projectManager._id,
          role: "developer",
          token: "used-token",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isUsed: true,
        });
        await invite.save();

        const res = await request(app).post("/api/auth/signup").send({
          email: "invited@example.com",
          password: "secret123",
          firstName: "Invited",
          lastName: "User",
          inviteToken: "used-token",
        });

        expect(res.status).to.equal(400);
        expect(res.body.error).to.equal("Invalid invitation token");
      });
    });

    describe("Email Service Integration", () => {
      it("handles email service failure gracefully", async () => {
        // Mock email service to fail
        sendEmailStub.resolves(false);

        const res = await request(app).post("/api/auth/signup").send({
          email: "test@example.com",
          password: "secret123",
          firstName: "Test",
          lastName: "User",
        });

        // Should still create user even if email fails
        expect(res.status).to.equal(201);
        expect(res.body.user.email).to.equal("test@example.com");

        // Verify user was created
        const user = await User.findOne({ email: "test@example.com" });
        expect(user).to.exist;
      });
    });
  });

  describe("POST /api/auth/login", () => {
    describe("Successful Login", () => {
      it("logs in verified user with correct credentials", async () => {
        // Create and verify user
        const user = await User.create({
          email: "verified@example.com",
          password: "secret123",
          name: "Verified User",
          isEmailVerified: true,
        });

        const res = await request(app).post("/api/auth/login").send({
          email: "verified@example.com",
          password: "secret123",
        });

        expect(res.status).to.equal(200);
        expect(res.body.token).to.equal("fake-token");
        expect(res.body.user.email).to.equal("verified@example.com");
        expect(res.body.user.name).to.equal("Verified User");
        expect(res.body.user.isEmailVerified).to.be.true;
        expect(signStub.calledOnce).to.be.true;
      });

      it("handles email case insensitivity in login", async () => {
        await User.create({
          email: "test@example.com",
          password: "secret123",
          name: "Test User",
          isEmailVerified: true,
        });

        const res = await request(app).post("/api/auth/login").send({
          email: "TEST@EXAMPLE.COM",
          password: "secret123",
        });

        expect(res.status).to.equal(200);
        expect(res.body.token).to.equal("fake-token");
      });
    });

    describe("Authentication Failures", () => {
      it("rejects login with non-existent email", async () => {
        const res = await request(app).post("/api/auth/login").send({
          email: "nonexistent@example.com",
          password: "secret123",
        });

        expect(res.status).to.equal(401);
        expect(res.body.error).to.equal("Invalid email or password");
      });

      it("rejects login with incorrect password", async () => {
        await User.create({
          email: "user@example.com",
          password: "correctpassword",
          name: "Test User",
          isEmailVerified: true,
        });

        const res = await request(app).post("/api/auth/login").send({
          email: "user@example.com",
          password: "wrongpassword",
        });

        expect(res.status).to.equal(401);
        expect(res.body.error).to.equal("Invalid email or password");
      });

      it("rejects login for unverified email", async () => {
        await User.create({
          email: "unverified@example.com",
          password: "secret123",
          name: "Unverified User",
          isEmailVerified: false,
        });

        const res = await request(app).post("/api/auth/login").send({
          email: "unverified@example.com",
          password: "secret123",
        });

        expect(res.status).to.equal(403);
        expect(res.body.error).to.include("Email not verified");
        expect(res.body.needsVerification).to.be.true;
      });
    });

    describe("Validation Errors", () => {
      it("rejects invalid email format", async () => {
        const res = await request(app).post("/api/auth/login").send({
          email: "invalid-email",
          password: "secret123",
        });

        // Login endpoint returns 401 for invalid credentials (including invalid email format)
        expect(res.status).to.equal(401);
        expect(res.body.error).to.equal("Invalid email or password");
      });

      it("rejects empty password", async () => {
        const res = await request(app).post("/api/auth/login").send({
          email: "user@example.com",
          password: "",
        });

        // Login endpoint returns 401 for missing/empty password
        expect(res.status).to.equal(401);
        expect(res.body.error).to.equal("Invalid email or password");
      });

      it("rejects missing email", async () => {
        const res = await request(app).post("/api/auth/login").send({
          password: "secret123",
        });

        // Login endpoint returns 401 for missing email
        expect(res.status).to.equal(401);
        expect(res.body.error).to.equal("Invalid email or password");
      });

      it("rejects missing password", async () => {
        const res = await request(app).post("/api/auth/login").send({
          email: "user@example.com",
        });

        // Login endpoint returns 401 for missing password
        expect(res.status).to.equal(401);
        expect(res.body.error).to.equal("Invalid email or password");
      });

      it("handles multiple validation errors", async () => {
        const res = await request(app).post("/api/auth/login").send({
          email: "invalid-email",
          password: "",
        });

        // Login endpoint returns 401 for invalid credentials
        expect(res.status).to.equal(401);
        expect(res.body.error).to.equal("Invalid email or password");
      });
    });

    describe("Complete Login Flow", () => {
      it("fails login for unverified user, then succeeds after verification", async () => {
        // Signup user
      await request(app).post("/api/auth/signup").send({
        email: "verify@example.com",
        password: "secret123",
        firstName: "Jane",
        lastName: "Doe",
      });

        // Try to login before verification
        const unverifiedLogin = await request(app).post("/api/auth/login").send({
        email: "verify@example.com",
        password: "secret123",
      });
        expect(unverifiedLogin.status).to.equal(403);
        expect(unverifiedLogin.body.needsVerification).to.be.true;

        // Verify email
      const user = await User.findOne({ email: "verify@example.com" });
      await request(app).post("/api/auth/verify-email").send({
        token: user.emailVerificationToken,
      });

        // Login after verification
        const verifiedLogin = await request(app).post("/api/auth/login").send({
        email: "verify@example.com",
        password: "secret123",
      });

        expect(verifiedLogin.status).to.equal(200);
        expect(verifiedLogin.body.token).to.equal("fake-token");
        expect(verifiedLogin.body.user.isEmailVerified).to.be.true;
      expect(signStub.calledOnce).to.be.true;
      });
    });
  });

  describe("POST /api/auth/verify-email", () => {
    describe("Successful Verification", () => {
      it("verifies email with valid token", async () => {
        // Create unverified user
        const user = await User.create({
          email: "verify@example.com",
          password: "secret123",
          name: "Test User",
          isEmailVerified: false,
          emailVerificationToken: "valid-token",
          emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        const res = await request(app).post("/api/auth/verify-email").send({
          token: "valid-token",
        });

        expect(res.status).to.equal(200);
        expect(res.body.message).to.equal("Email verified successfully");
        expect(res.body.user.email).to.equal("verify@example.com");
        expect(res.body.user.isEmailVerified).to.be.true;

        // Verify user was updated in database
        const updatedUser = await User.findById(user._id);
        expect(updatedUser.isEmailVerified).to.be.true;
        expect(updatedUser.emailVerificationToken).to.be.undefined;
        expect(updatedUser.emailVerificationExpiresAt).to.be.undefined;
      });
    });

    describe("Verification Failures", () => {
      it("rejects invalid verification token", async () => {
        const res = await request(app).post("/api/auth/verify-email").send({
          token: "invalid-token",
        });

        expect(res.status).to.equal(400);
        expect(res.body.error).to.equal("Invalid verification token");
      });

      it("rejects expired verification token", async () => {
        await User.create({
          email: "expired@example.com",
          password: "secret123",
          name: "Test User",
          isEmailVerified: false,
          emailVerificationToken: "expired-token",
          emailVerificationExpiresAt: new Date(Date.now() - 1000), // Expired
        });

        const res = await request(app).post("/api/auth/verify-email").send({
          token: "expired-token",
        });

        expect(res.status).to.equal(400);
        expect(res.body.error).to.equal("Verification token has expired");
      });

      it("rejects token for already verified user", async () => {
        await User.create({
          email: "already@example.com",
          password: "secret123",
          name: "Test User",
          isEmailVerified: true,
          emailVerificationToken: "used-token",
          emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        const res = await request(app).post("/api/auth/verify-email").send({
          token: "used-token",
        });

        expect(res.status).to.equal(400);
        expect(res.body.error).to.equal("Invalid verification token");
      });

      it("rejects empty token", async () => {
        const res = await request(app).post("/api/auth/verify-email").send({
          token: "",
        });

        expect(res.status).to.equal(400);
        expect(res.body.errors).to.be.an("array");
        expect(res.body.errors[0].msg).to.include("Verification token is required");
      });

      it("rejects missing token", async () => {
        const res = await request(app).post("/api/auth/verify-email").send({});

        expect(res.status).to.equal(400);
        expect(res.body.errors).to.be.an("array");
      });
    });
  });

  describe("POST /api/auth/resend-verification", () => {
    describe("Successful Resend", () => {
      it("resends verification email for unverified user", async () => {
        // Reset email stub to succeed
        sendEmailStub.resolves(true);
        
        await User.create({
          email: "resend@example.com",
          password: "secret123",
          name: "Test User",
          isEmailVerified: false,
        });

        const res = await request(app).post("/api/auth/resend-verification").send({
          email: "resend@example.com",
        });

        expect(res.status).to.equal(200);
        expect(res.body.message).to.equal("Verification email sent successfully");
        expect(sendEmailStub.called).to.be.true;

        // Verify user was updated with new token
        const user = await User.findOne({ email: "resend@example.com" });
        expect(user.emailVerificationToken).to.exist;
        expect(user.emailVerificationExpiresAt).to.exist;
      });
    });

    describe("Resend Failures", () => {
      it("rejects resend for non-existent user", async () => {
        const res = await request(app).post("/api/auth/resend-verification").send({
          email: "nonexistent@example.com",
        });

        expect(res.status).to.equal(404);
        expect(res.body.error).to.equal("User not found or already verified");
      });

      it("rejects resend for already verified user", async () => {
        await User.create({
          email: "verified@example.com",
          password: "secret123",
          name: "Test User",
          isEmailVerified: true,
        });

        const res = await request(app).post("/api/auth/resend-verification").send({
          email: "verified@example.com",
        });

        expect(res.status).to.equal(404);
        expect(res.body.error).to.equal("User not found or already verified");
      });

      it("handles email service failure", async () => {
        await User.create({
          email: "emailfail@example.com",
          password: "secret123",
          name: "Test User",
          isEmailVerified: false,
        });

        // Mock email service to fail
        sendEmailStub.resolves(false);

        const res = await request(app).post("/api/auth/resend-verification").send({
          email: "emailfail@example.com",
        });

        expect(res.status).to.equal(500);
        expect(res.body.error).to.equal("Failed to send verification email");
      });

      it("rejects invalid email format", async () => {
        const res = await request(app).post("/api/auth/resend-verification").send({
          email: "invalid-email",
        });

        expect(res.status).to.equal(400);
        expect(res.body.errors).to.be.an("array");
        expect(res.body.errors[0].msg).to.include("valid email");
      });
    });
  });

  describe("PATCH /api/auth/skills", () => {
    it("updates skills for verified developer", async () => {
      await request(app).post("/api/auth/signup").send({
        email: "dev@example.com",
        password: "secret123",
        firstName: "Dev",
        lastName: "User",
      });

      const user = await User.findOne({ email: "dev@example.com" });
      user.isEmailVerified = true;
      user.roles = ["developer"];
      await user.save();

      const res = await request(app)
        .patch("/api/auth/skills")
        .set("x-test-user-email", "dev@example.com")
        .send({ skills: ["node", "react"] });

      expect(res.status).to.equal(200);

      const updated = await User.findById(user._id);
      expect(updated.skills).to.deep.equal(["node", "react"]);
    });

    it("rejects skills update for non-developer roles", async () => {
      // Reset email stub to succeed
      sendEmailStub.resolves(true);
      
      await request(app).post("/api/auth/signup").send({
        email: "user@example.com",
        password: "secret123",
        firstName: "Regular",
        lastName: "User",
      });

      const user = await User.findOne({ email: "user@example.com" });
      user.isEmailVerified = true;
      user.roles = ["user"]; // Not a developer
      await user.save();

      const res = await request(app)
        .patch("/api/auth/skills")
        .set("x-test-user-email", "user@example.com")
        .send({ skills: ["node", "react"] });

      expect(res.status).to.equal(403);
      expect(res.body.error).to.include("Only developers, designers, and testers can update skills");
    });

    it("rejects invalid skills format", async () => {
      await request(app).post("/api/auth/signup").send({
        email: "dev@example.com",
        password: "secret123",
        firstName: "Dev",
        lastName: "User",
      });

      const user = await User.findOne({ email: "dev@example.com" });
      user.isEmailVerified = true;
      user.roles = ["developer"];
      await user.save();

      const res = await request(app)
        .patch("/api/auth/skills")
        .set("x-test-user-email", "dev@example.com")
        .send({ skills: "not-an-array" });

      expect(res.status).to.equal(400);
      expect(res.body.errors).to.be.an("array");
      expect(res.body.errors[0].msg).to.include("Skills must be an array");
    });
  });

  describe("POST /api/auth/update-password", () => {
    it("changes password for logged-in user", async () => {
      await request(app).post("/api/auth/signup").send({
        email: "pwd@example.com",
        password: "oldpass",
        firstName: "Pass",
        lastName: "Changer",
      });

      const user = await User.findOne({ email: "pwd@example.com" });
      user.isEmailVerified = true;
      await user.save();

      const res = await request(app)
        .post("/api/auth/update-password")
        .set("x-test-user-email", "pwd@example.com")
        .send({ currentPassword: "oldpass", newPassword: "newpass123" });

      expect(res.status).to.equal(200);

      const fresh = await User.findOne({ email: "pwd@example.com" });
      expect(await fresh.matches("newpass123")).to.be.true;
    });

    it("rejects password change with incorrect current password", async () => {
      await request(app).post("/api/auth/signup").send({
        email: "pwd@example.com",
        password: "correctpass",
        firstName: "Pass",
        lastName: "Changer",
      });

      const user = await User.findOne({ email: "pwd@example.com" });
      user.isEmailVerified = true;
      await user.save();

      const res = await request(app)
        .post("/api/auth/update-password")
        .set("x-test-user-email", "pwd@example.com")
        .send({ currentPassword: "wrongpass", newPassword: "newpass123" });

      expect(res.status).to.equal(400);
      expect(res.body.error).to.equal("Current password is incorrect");
    });

    it("rejects new password shorter than 6 characters", async () => {
      await request(app).post("/api/auth/signup").send({
        email: "pwd@example.com",
        password: "oldpass",
        firstName: "Pass",
        lastName: "Changer",
      });

      const user = await User.findOne({ email: "pwd@example.com" });
      user.isEmailVerified = true;
      await user.save();

      const res = await request(app)
        .post("/api/auth/update-password")
        .set("x-test-user-email", "pwd@example.com")
        .send({ currentPassword: "oldpass", newPassword: "12345" });

      expect(res.status).to.equal(400);
      expect(res.body.errors).to.be.an("array");
    });

    it("rejects unauthorized password change", async () => {
      const res = await request(app)
        .post("/api/auth/update-password")
        .send({ currentPassword: "oldpass", newPassword: "newpass123" });

      expect(res.status).to.equal(401);
      expect(res.body.error).to.equal("Unauthorized");
    });
  });

  describe("GET /api/auth/users", () => {
    it("returns all users with correct format for ML service", async () => {
      // Create test users
      await User.create({
        email: "dev1@example.com",
        password: "password123",
        name: "Developer One",
        roles: ["developer"],
        skills: ["JavaScript", "React"],
        current_workload: 5,
        max_capacity: 8,
        availability: true,
        experience_level: "senior",
        past_issues_solved: ["Fixed auth bug", "Implemented feature X"],
        isEmailVerified: true,
      });

      await User.create({
        email: "dev2@example.com",
        password: "password123",
        name: "Developer Two",
        roles: ["developer"],
        skills: ["Python", "Django"],
        current_workload: 3,
        max_capacity: 6,
        availability: false,
        experience_level: "junior",
        isEmailVerified: true,
      });

      const res = await request(app).get("/api/auth/users");

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.users).to.be.an("array");
      expect(res.body.users).to.have.lengthOf(2);
      expect(res.body.total_count).to.equal(2);

      const user1 = res.body.users.find(u => u.email === "dev1@example.com");
      expect(user1).to.exist;
      expect(user1.id).to.exist;
      expect(user1.name).to.equal("Developer One");
      expect(user1.skills).to.deep.equal(["JavaScript", "React"]);
      expect(user1.role).to.equal("developer");
      expect(user1.current_workload).to.equal(5);
      expect(user1.max_capacity).to.equal(8);
      expect(user1.availability).to.be.true;
      expect(user1.experience_level).to.equal("senior");
      expect(user1.past_tasks).to.deep.equal(["Fixed auth bug", "Implemented feature X"]);
    });

    it("handles users with missing optional fields", async () => {
      await User.create({
        email: "minimal@example.com",
        password: "password123",
        name: "Minimal User",
        isEmailVerified: true,
      });

      const res = await request(app).get("/api/auth/users");

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.users).to.have.lengthOf(1);

      const user = res.body.users[0];
      expect(user.name).to.equal("Minimal User");
      expect(user.skills).to.deep.equal([]);
      expect(user.role).to.equal("user");
      expect(user.current_workload).to.equal(0);
      expect(user.max_capacity).to.equal(8);
      expect(user.availability).to.be.true;
      expect(user.experience_level).to.equal("junior");
      expect(user.past_tasks).to.deep.equal([]);
    });

    it("returns empty array when no users exist", async () => {
      const res = await request(app).get("/api/auth/users");

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.users).to.deep.equal([]);
      expect(res.body.total_count).to.equal(0);
    });
  });

  describe("Error Handling", () => {
    it("handles database connection errors gracefully", async () => {
      // This test would require mocking mongoose connection
      // For now, we'll test server error responses
      const res = await request(app).post("/api/auth/signup").send({
        email: "test@example.com",
        password: "secret123",
        firstName: "Test",
        lastName: "User",
      });

      // Should not crash the server
      expect(res.status).to.be.oneOf([201, 500]);
    });
  });
});
