const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const Invite = require("../models/Invite");
const { sign, requireAuth } = require("../utils/auth");
const {
  sendEmailVerification,
  sendPasswordResetEmail,
} = require("../utils/email");
const router = express.Router();
const { sanitizeBody } = require("../utils/sanitization");

/* POST /api/auth/signup */
router.post(
  "/signup",
  sanitizeBody(["firstName", "lastName"]),
  body("email")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("firstName").notEmpty().withMessage("First name is required"),
  body("lastName").notEmpty().withMessage("Last name is required"),
  body("inviteToken").optional(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    const { email, password, firstName, lastName, inviteToken } = req.body;
    try {
      if (await User.exists({ email })) {
        return res.status(409).json({ error: "Email already in use" });
      }
      let invite = null;
      let invitedBy = null;
      let assignedRole = "user";
      if (inviteToken) {
        invite = await Invite.findOne({ token: inviteToken, isUsed: false });
        if (!invite) {
          return res.status(400).json({ error: "Invalid invitation token" });
        }
        if (invite.isExpired()) {
          return res.status(400).json({ error: "Invitation has expired" });
        }
        if (invite.email.toLowerCase() !== email.toLowerCase()) {
          return res
            .status(400)
            .json({ error: "Email does not match invitation" });
        }
        invitedBy = invite.invitedBy;
        assignedRole = invite.role;
      }
      const user = new User({
        email,
        password,
        name: `${firstName} ${lastName}`,
        roles: [assignedRole],
        invitedBy,
      });
      user.emailVerificationToken = require("crypto")
        .randomBytes(32)
        .toString("hex");
      user.emailVerificationExpiresAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      );
      await user.save();
      if (invite) {
        invite.isUsed = true;
        await invite.save();
      }
      const emailSent = await sendEmailVerification(
        email,
        user.emailVerificationToken
      );
      if (!emailSent) {
        console.error("Failed to send verification email for:", email);
      }
      res.status(201).json({
        message:
          "Account created successfully. Please check your email to verify your account.",
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          roles: user.roles,
          isEmailVerified: user.isEmailVerified,
        },
      });
    } catch (error) {
      console.error("Error during signup:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.post(
  "/login",
  body("email").isEmail().withMessage("Please enter a valid email address"),
  body("password").notEmpty().withMessage("Password is required"),
  async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user || !(await user.matches(password))) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      if (!user.isEmailVerified) {
        return res.status(403).json({
          error:
            "Email not verified. Please check your email and click the verification link.",
          needsVerification: true,
        });
      }
      res.json({
        token: sign(user),
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          roles: user.roles,
          isEmailVerified: user.isEmailVerified,
        },
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.post(
  "/verify-email",
  body("token").notEmpty().withMessage("Verification token is required"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { token } = req.body;
    try {
      const user = await User.findOne({
        emailVerificationToken: token,
        isEmailVerified: false,
      });
      if (!user) {
        return res.status(400).json({ error: "Invalid verification token" });
      }
      if (user.emailVerificationExpiresAt < new Date()) {
        return res
          .status(400)
          .json({ error: "Verification token has expired" });
      }
      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpiresAt = undefined;
      await user.save();
      res.json({
        message: "Email verified successfully",
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          isEmailVerified: user.isEmailVerified,
        },
      });
    } catch (error) {
      console.error("Error during email verification:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.post(
  "/resend-verification",
  body("email").isEmail().withMessage("Please enter a valid email address"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email } = req.body;
    try {
      const user = await User.findOne({ email, isEmailVerified: false });
      if (!user) {
        return res
          .status(404)
          .json({ error: "User not found or already verified" });
      }
      user.emailVerificationToken = require("crypto")
        .randomBytes(32)
        .toString("hex");
      user.emailVerificationExpiresAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      );
      await user.save();
      const emailSent = await sendEmailVerification(
        email,
        user.emailVerificationToken
      );
      if (!emailSent) {
        return res
          .status(500)
          .json({ error: "Failed to send verification email" });
      }
      res.json({ message: "Verification email sent successfully" });
    } catch (error) {
      console.error("Error resending verification:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.post(
  "/forgot-password",
  body("email").isEmail().withMessage("Please enter a valid email address"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({
          message:
            "If an account with that email exists, a password reset link has been sent.",
        });
      }

      // Generate password reset token
      user.passwordResetToken = require("crypto")
        .randomBytes(32)
        .toString("hex");
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      const emailSent = await sendPasswordResetEmail(
        email,
        user.passwordResetToken
      );
      if (!emailSent) {
        return res
          .status(500)
          .json({ error: "Failed to send password reset email" });
      }

      res.json({
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    } catch (error) {
      console.error("Error in forgot password:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.post(
  "/reset-password",
  body("token").notEmpty().withMessage("Reset token is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { token, newPassword } = req.body;
    try {
      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpiresAt: { $gt: new Date() },
      });

      if (!user) {
        return res
          .status(400)
          .json({ error: "Invalid or expired reset token" });
      }

      // Update password and clear reset token
      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpiresAt = undefined;
      await user.save();

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.post(
  "/update-password",
  requireAuth,
  body("currentPassword").notEmpty(),
  body("newPassword").isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!(await user.matches(currentPassword))) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      user.password = newPassword;
      await user.save();

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.patch(
  "/skills",
  requireAuth,
  body("skills").isArray().withMessage("Skills must be an array"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { skills } = req.body;
    const allowedRoles = ["developer", "designer", "tester"];
    const user = req.user;
    if (!user.roles.some((role) => allowedRoles.includes(role))) {
      return res
        .status(403)
        .json({
          error: "Only developers, designers, and testers can update skills.",
        });
    }
    user.skills = skills;
    await user.save();
    res.json({ message: "Skills updated successfully", skills: user.skills });
  }
);

/* GET /api/auth/users - Fetch all users for ML service */
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({})
      .select(
        "name email skills roles current_workload max_capacity availability experience_level past_issues_solved"
      )
      .lean();

    const transformedUsers = users.map((user) => ({
      id: user._id.toString(),
      name: user.name || "Unknown",
      email: user.email,
      skills: user.skills || [],
      role: user.roles?.[0] || "developer",
      current_workload: user.current_workload || 0,
      max_capacity: user.max_capacity || 8,
      availability: user.availability !== false,
      experience_level: user.experience_level || "junior",
      past_tasks: user.past_issues_solved || [],
    }));

    res.json({
      success: true,
      users: transformedUsers,
      total_count: transformedUsers.length,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
});

module.exports = router;
