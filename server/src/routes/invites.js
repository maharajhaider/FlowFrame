const express = require('express');
const { body, validationResult } = require('express-validator');
const Invite = require('../models/Invite');
const User = require('../models/User');
const { sendInvitationEmail } = require('../utils/email');
const { requireAuth } = require('../utils/auth');
const router = express.Router();

// Middleware to check if user is project manager
const requireProjectManager = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isProjectManager()) {
      return res.status(403).json({ error: 'Access denied. Project manager role required.' });
    }
    req.currentUser = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/invites - Send invitation (Project Manager only)
router.post(
  '/',
  requireAuth,
  requireProjectManager,
  body('email').isEmail().normalizeEmail(),
  body('role').isIn(['user', 'project_manager', 'developer', 'designer', 'tester']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, role } = req.body;

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      // Check if invitation already exists and is not expired
      const existingInvite = await Invite.findOne({ 
        email, 
        isUsed: false,
        expiresAt: { $gt: new Date() }
      });
      
      if (existingInvite) {
        return res.status(409).json({ error: 'Invitation already sent to this email' });
      }

      // Create new invitation
      const invite = new Invite({
        email,
        role,
        invitedBy: req.user.id,
      });
      
      invite.generateToken();
      await invite.save();

      // Send invitation email
      const emailSent = await sendInvitationEmail(
        email, 
        invite.token, 
        req.currentUser.name || req.currentUser.email,
        role
      );

      if (!emailSent) {
        await invite.deleteOne();
        return res.status(500).json({ error: 'Failed to send invitation email' });
      }

      res.status(201).json({
        message: 'Invitation sent successfully',
        invite: {
          id: invite._id,
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt,
        }
      });

    } catch (error) {
      console.error('Error creating invitation:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /api/invites - Get all invitations sent by current user
router.get(
  '/',
  requireAuth,
  requireProjectManager,
  async (req, res) => {
    try {
      const invites = await Invite.find({ invitedBy: req.user.id })
        .sort({ createdAt: -1 })
        .populate('invitedBy', 'name email');

      res.json(invites);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /api/invites/:token - Validate invitation token
router.get(
  '/:token',
  async (req, res) => {
    try {
      const { token } = req.params;
      
      const invite = await Invite.findOne({ token, isUsed: false });
      
      if (!invite) {
        return res.status(404).json({ error: 'Invalid or expired invitation' });
      }

      if (invite.isExpired()) {
        return res.status(410).json({ error: 'Invitation has expired' });
      }

      res.json({
        email: invite.email,
        role: invite.role,
        invitedBy: invite.invitedBy,
        expiresAt: invite.expiresAt,
      });

    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// DELETE /api/invites/:id - Cancel invitation (Project Manager only)
router.delete(
  '/:id',
  requireAuth,
  requireProjectManager,
  async (req, res) => {
    try {
      const invite = await Invite.findOne({
        _id: req.params.id,
        invitedBy: req.user.id,
        isUsed: false,
      });

      if (!invite) {
        return res.status(404).json({ error: 'Invitation not found' });
      }

      await invite.deleteOne();
      res.json({ message: 'Invitation cancelled successfully' });

    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router; 