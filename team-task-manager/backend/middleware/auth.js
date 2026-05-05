const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, avatar_color FROM users WHERE id = ?').get(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

const requireProjectRole = (roles = ['admin', 'member']) => {
  return (req, res, next) => {
    const projectId = req.params.projectId || req.body.project_id;
    if (!projectId) return next();

    const member = db.prepare(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(projectId, req.user.id);

    // Also check if user is the project owner
    const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(projectId);

    if (!member && (!project || project.owner_id !== req.user.id)) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
    }

    const userRole = project && project.owner_id === req.user.id ? 'admin' : member.role;

    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}.` });
    }

    req.projectRole = userRole;
    req.project = project;
    next();
  };
};

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

module.exports = { authenticate, requireProjectRole, generateToken, JWT_SECRET };
