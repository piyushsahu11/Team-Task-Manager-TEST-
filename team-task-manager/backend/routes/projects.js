const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { authenticate, requireProjectRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/projects - Get all projects for authenticated user
router.get('/', authenticate, (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT 
        p.*,
        u.name as owner_name,
        u.email as owner_email,
        pm.role as my_role,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as done_count,
        COUNT(DISTINCT pm2.user_id) as member_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      LEFT JOIN project_members pm2 ON pm2.project_id = p.id
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE p.owner_id = ? OR pm.user_id = ?
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `).all(req.user.id, req.user.id, req.user.id);

    res.json({ projects });
  } catch (err) {
    console.error('Get projects error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects - Create project
router.post('/', authenticate, [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Project name required (max 100 chars)'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('deadline').optional().isISO8601(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description, color, deadline } = req.body;

  try {
    const result = db.prepare(
      'INSERT INTO projects (name, description, color, owner_id, deadline) VALUES (?, ?, ?, ?, ?)'
    ).run(name, description || null, color || '#3B82F6', req.user.id, deadline || null);

    // Add owner as admin member
    db.prepare(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
    ).run(result.lastInsertRowid, req.user.id, 'admin');

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ project, message: 'Project created successfully' });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/:projectId
router.get('/:projectId', authenticate, (req, res) => {
  try {
    const { projectId } = req.params;

    const project = db.prepare(`
      SELECT p.*, u.name as owner_name, pm.role as my_role
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      WHERE p.id = ? AND (p.owner_id = ? OR pm.user_id = ?)
    `).get(req.user.id, projectId, req.user.id, req.user.id);

    if (!project) return res.status(404).json({ error: 'Project not found or access denied' });

    const members = db.prepare(`
      SELECT u.id, u.name, u.email, u.avatar_color, pm.role, pm.joined_at
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = ?
      ORDER BY pm.role DESC, u.name ASC
    `).all(projectId);

    const taskStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'todo' THEN 1 END) as todo,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'review' THEN 1 END) as review,
        COUNT(CASE WHEN status = 'done' THEN 1 END) as done,
        COUNT(CASE WHEN due_date < CURRENT_TIMESTAMP AND status != 'done' THEN 1 END) as overdue
      FROM tasks WHERE project_id = ?
    `).get(projectId);

    res.json({ project, members, taskStats });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:projectId - Update project (admin only)
router.put('/:projectId', authenticate, requireProjectRole(['admin']), [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('status').optional().isIn(['active', 'completed', 'archived']),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { projectId } = req.params;
  const { name, description, status, color, deadline } = req.body;

  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    db.prepare(`
      UPDATE projects SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        color = COALESCE(?, color),
        deadline = COALESCE(?, deadline),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, description, status, color, deadline, projectId);

    const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    res.json({ project: updated, message: 'Project updated successfully' });
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/projects/:projectId - Owner only
router.delete('/:projectId', authenticate, (req, res) => {
  const { projectId } = req.params;

  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only project owner can delete the project' });
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:projectId/members - Add member (admin only)
router.post('/:projectId/members', authenticate, requireProjectRole(['admin']), [
  body('email').isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'member']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { projectId } = req.params;
  const { email, role = 'member' } = req.body;

  try {
    const user = db.prepare('SELECT id, name, email, avatar_color FROM users WHERE email = ?').get(email);
    if (!user) return res.status(404).json({ error: 'User not found with this email' });

    const existing = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, user.id);
    if (existing) return res.status(409).json({ error: 'User is already a member of this project' });

    db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(projectId, user.id, role);

    // Notify user
    db.prepare('INSERT INTO notifications (user_id, type, message, related_id) VALUES (?, ?, ?, ?)').run(
      user.id, 'project_invite', `You have been added to a project as ${role}`, projectId
    );

    res.status(201).json({ member: { ...user, role }, message: 'Member added successfully' });
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:projectId/members/:userId - Update member role (admin only)
router.put('/:projectId/members/:userId', authenticate, requireProjectRole(['admin']), [
  body('role').isIn(['admin', 'member']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { projectId, userId } = req.params;
  const { role } = req.body;

  try {
    // Prevent owner from losing admin role
    const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(projectId);
    if (project.owner_id == userId && role !== 'admin') {
      return res.status(400).json({ error: 'Project owner must remain admin' });
    }

    db.prepare('UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?').run(role, projectId, userId);
    res.json({ message: 'Member role updated' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/projects/:projectId/members/:userId - Remove member (admin only)
router.delete('/:projectId/members/:userId', authenticate, requireProjectRole(['admin']), (req, res) => {
  const { projectId, userId } = req.params;

  try {
    const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(projectId);
    if (project.owner_id == userId) {
      return res.status(400).json({ error: 'Cannot remove project owner' });
    }

    db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(projectId, userId);
    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
