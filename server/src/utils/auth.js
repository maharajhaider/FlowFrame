const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

// create a signed token
function sign(user) {
  return jwt.sign({ id: user._id, roles: user.roles }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });
}

// middleware: verify token & attach user
async function requireAuth(req, res, next) {
  const token = req.header('Authorization')?.replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'Login required' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(payload.id).select('-password');
    if (!req.user) throw new Error('User not found');
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid / expired token' });
  }
}

// middleware factory: require specific role(s)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Login required' });
    const ok = req.user.roles.some(r => roles.includes(r));
    if (!ok) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

function requireEditPermission(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  const canEdit = req.user.roles.some(role => ['developer', 'project_manager'].includes(role));
  if (!canEdit) return res.status(403).json({ error: 'Edit permission required. Only developers and project managers can modify tasks.' });
  next();
}

module.exports = { sign, requireAuth, requireRole, requireEditPermission };
