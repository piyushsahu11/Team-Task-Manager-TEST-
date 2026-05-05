const express = require('express');
const { body, query, validationResult } = require('express-validator');
const db = require('../db/database');
const { authenticate, requireProjectRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/tasks - Get all tasks for user (dashboard)
router.get('/', authenticate, (req, res) => {
  try {
    const { status, priority, overdue, project_id } = req.query;

    let sql = `
      SELECT t.*, 
        p.name as project_name, p.color as project_color,
        u.name as assignee_name, u.avatar_color as assignee_avatar,
        c.name as creator_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN users c ON c.id = t.created_by
      WHERE (t.assigned_to = ? OR t.created_by = ?)
    `;
    const params = [req.user.id, req.user.id];

    if (status) { sql += ' AND t.status = ?'; params.push(status); }
    if (priority) { sql += ' AND t.priority = ?'; params.push(priority); }
    if (project_id) { sql += ' AND t.project_id = ?'; params.push(project_id); }
    if (overdue === 'true') {
      sql += " AND t.due_date < CURRENT_TIMESTAMP AND t.status != 'done'";
    }

    sql += ' ORDER BY t.due_date ASC, t.priority DESC, t.created_at DESC';

    const tasks = db.prepare(sql).all(...params);
    res.json({ tasks });
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tasks/dashboard - Dashboard stats
router.get('/dashboard', authenticate, (req, res) => {
  try {
    const myTaskStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'todo' THEN 1 END) as todo,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'review' THEN 1 END) as review,
        COUNT(CASE WHEN status = 'done' THEN 1 END) as done,
        COUNT(CASE WHEN due_date < CURRENT_TIMESTAMP AND status != 'done' THEN 1 END) as overdue
      FROM tasks WHERE assigned_to = ?
    `).get(req.user.id);

    const recentTasks = db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color,
        u.name as assignee_name, u.avatar_color as assignee_avatar
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.assigned_to
      WHERE t.assigned_to = ? AND t.status != 'done'
      ORDER BY t.due_date ASC NULLS LAST, t.priority DESC
      LIMIT 8
    `).all(req.user.id);

    const overdueTasks = db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.assigned_to = ? AND t.due_date < CURRENT_TIMESTAMP AND t.status != 'done'
      ORDER BY t.due_date ASC
      LIMIT 5
    `).all(req.user.id);

    const projectStats = db.prepare(`
      SELECT p.id, p.name, p.color,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.status = 'done' THEN 1 END) as done_tasks
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      LEFT JOIN tasks t ON t.project_id = p.id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
      LIMIT 5
    `).all(req.user.id);

    const activityFeed = db.prepare(`
      SELECT t.id, t.title, t.status, t.updated_at,
        p.name as project_name, p.color as project_color,
        u.name as assignee_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      LEFT JOIN users u ON u.id = t.assigned_to
      ORDER BY t.updated_at DESC
      LIMIT 10
    `).all(req.user.id);

    res.json({ myTaskStats, recentTasks, overdueTasks, projectStats, activityFeed });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tasks/project/:projectId - Get tasks for a project
router.get('/project/:projectId', authenticate, (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, priority, assigned_to } = req.query;

    // Check access
    const access = db.prepare(`
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      WHERE p.id = ? AND (p.owner_id = ? OR pm.user_id = ?)
    `).get(req.user.id, projectId, req.user.id, req.user.id);

    if (!access) return res.status(403).json({ error: 'Access denied' });

    let sql = `
      SELECT t.*, 
        u.name as assignee_name, u.email as assignee_email, u.avatar_color as assignee_avatar,
        c.name as creator_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN users c ON c.id = t.created_by
      WHERE t.project_id = ?
    `;
    const params = [projectId];

    if (status) { sql += ' AND t.status = ?'; params.push(status); }
    if (priority) { sql += ' AND t.priority = ?'; params.push(priority); }
    if (assigned_to) { sql += ' AND t.assigned_to = ?'; params.push(assigned_to); }

    sql += ' ORDER BY t.due_date ASC NULLS LAST, t.priority DESC, t.created_at DESC';

    const tasks = db.prepare(sql).all(...params);
    res.json({ tasks });
  } catch (err) {
    console.error('Get project tasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks - Create task
router.post('/', authenticate, [
  body('project_id').isInt().withMessage('Valid project ID required'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Task title required'),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('assigned_to').optional().isInt(),
  body('due_date').optional().isISO8601(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { project_id, title, description, priority, status, assigned_to, due_date } = req.body;

  try {
    // Verify project access
    const access = db.prepare(`
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      WHERE p.id = ? AND (p.owner_id = ? OR pm.user_id = ?)
    `).get(req.user.id, project_id, req.user.id, req.user.id);

    if (!access) return res.status(403).json({ error: 'Access denied to this project' });

    // Verify assignee is member
    if (assigned_to) {
      const isMember = db.prepare(`
        SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?
        UNION SELECT 1 FROM projects WHERE id = ? AND owner_id = ?
      `).get(project_id, assigned_to, project_id, assigned_to);
      if (!isMember) return res.status(400).json({ error: 'Assignee must be a project member' });
    }

    const result = db.prepare(`
      INSERT INTO tasks (project_id, title, description, priority, status, assigned_to, created_by, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      project_id, title, description || null,
      priority || 'medium', status || 'todo',
      assigned_to || null, req.user.id, due_date || null
    );

    const task = db.prepare(`
      SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_avatar
      FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to
      WHERE t.id = ?
    `).get(result.lastInsertRowid);

    // Notify assignee
    if (assigned_to && assigned_to !== req.user.id) {
      db.prepare('INSERT INTO notifications (user_id, type, message, related_id) VALUES (?, ?, ?, ?)').run(
        assigned_to, 'task_assigned', `You have been assigned a task: ${title}`, result.lastInsertRowid
      );
    }

    // Update project timestamp
    db.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(project_id);

    res.status(201).json({ task, message: 'Task created successfully' });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tasks/:taskId - Get single task
router.get('/:taskId', authenticate, (req, res) => {
  try {
    const task = db.prepare(`
      SELECT t.*,
        u.name as assignee_name, u.email as assignee_email, u.avatar_color as assignee_avatar,
        c.name as creator_name,
        p.name as project_name, p.color as project_color
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN users c ON c.id = t.created_by
      WHERE t.id = ?
    `).get(req.params.taskId);

    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Check access
    const access = db.prepare(`
      SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?
      UNION SELECT 1 FROM projects WHERE id = ? AND owner_id = ?
    `).get(task.project_id, req.user.id, task.project_id, req.user.id);

    if (!access) return res.status(403).json({ error: 'Access denied' });

    const comments = db.prepare(`
      SELECT tc.*, u.name, u.avatar_color
      FROM task_comments tc
      JOIN users u ON u.id = tc.user_id
      WHERE tc.task_id = ?
      ORDER BY tc.created_at ASC
    `).all(req.params.taskId);

    res.json({ task, comments });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/tasks/:taskId - Update task
router.put('/:taskId', authenticate, [
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('assigned_to').optional(),
  body('due_date').optional(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { taskId } = req.params;

  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const access = db.prepare(`
      SELECT pm.role FROM project_members pm WHERE pm.project_id = ? AND pm.user_id = ?
      UNION SELECT 'admin' FROM projects WHERE id = ? AND owner_id = ?
    `).get(task.project_id, req.user.id, task.project_id, req.user.id);

    if (!access) return res.status(403).json({ error: 'Access denied' });

    const { title, description, priority, status, assigned_to, due_date } = req.body;

    // Track completion
    let completed_at = task.completed_at;
    if (status === 'done' && task.status !== 'done') {
      completed_at = new Date().toISOString();
    } else if (status && status !== 'done') {
      completed_at = null;
    }

    db.prepare(`
      UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        priority = COALESCE(?, priority),
        status = COALESCE(?, status),
        assigned_to = ?,
        due_date = COALESCE(?, due_date),
        completed_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title, description, priority, status,
      assigned_to !== undefined ? (assigned_to || null) : task.assigned_to,
      due_date, completed_at, taskId
    );

    // Notify new assignee
    if (assigned_to && assigned_to !== task.assigned_to && assigned_to !== req.user.id) {
      db.prepare('INSERT INTO notifications (user_id, type, message, related_id) VALUES (?, ?, ?, ?)').run(
        assigned_to, 'task_assigned', `You have been assigned: ${task.title}`, taskId
      );
    }

    db.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(task.project_id);

    const updated = db.prepare(`
      SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_avatar
      FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to WHERE t.id = ?
    `).get(taskId);

    res.json({ task: updated, message: 'Task updated successfully' });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/tasks/:taskId
router.delete('/:taskId', authenticate, (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Admin or task creator can delete
    const isAdmin = db.prepare(`
      SELECT 1 FROM projects WHERE id = ? AND owner_id = ?
      UNION SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ? AND role = 'admin'
    `).get(task.project_id, req.user.id, task.project_id, req.user.id);

    if (!isAdmin && task.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Only admins or task creator can delete tasks' });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks/:taskId/comments
router.post('/:taskId/comments', authenticate, [
  body('content').trim().isLength({ min: 1, max: 1000 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const result = db.prepare(
      'INSERT INTO task_comments (task_id, user_id, content) VALUES (?, ?, ?)'
    ).run(req.params.taskId, req.user.id, req.body.content);

    const comment = db.prepare(`
      SELECT tc.*, u.name, u.avatar_color
      FROM task_comments tc JOIN users u ON u.id = tc.user_id
      WHERE tc.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ comment });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
