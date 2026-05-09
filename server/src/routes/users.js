const express = require('express');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { requireAuth } = require('../utils/auth');

const router = express.Router();

// GET /api/users - Get all users for task assignment
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      const users = await User.find({
        roles: { $in: ['developer', 'designer', 'tester'] }
      }).select('_id name');
      
      const formattedUsers = users.map(user => ({
        _id: user._id,
        name: user.name || 'Unnamed User'
      }));
      
      res.json(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  })
);

module.exports = router; 