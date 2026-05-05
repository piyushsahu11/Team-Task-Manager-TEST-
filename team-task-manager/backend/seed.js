/**
 * Seed script - creates demo data for first deploy
 * Run: node --experimental-sqlite seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db/database');

async function seed() {
  console.log('🌱 Seeding demo data...');

  // Create demo users
  const adminHash = await bcrypt.hash('demo1234', 12);
  const memberHash = await bcrypt.hash('member123', 12);

  let adminId, memberId, dev2Id;

  try {
    const r1 = db.prepare('INSERT INTO users (name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?)').run('Demo Admin', 'demo@taskflow.app', adminHash, '#3B82F6');
    adminId = r1.lastInsertRowid;
    console.log('✅ Created admin user: demo@taskflow.app / demo1234');
  } catch {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@taskflow.app');
    adminId = existing.id;
    console.log('ℹ️  Admin user already exists');
  }

  try {
    const r2 = db.prepare('INSERT INTO users (name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?)').run('Jane Developer', 'jane@taskflow.app', memberHash, '#22C55E');
    memberId = r2.lastInsertRowid;
    const r3 = db.prepare('INSERT INTO users (name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?)').run('Bob Designer', 'bob@taskflow.app', memberHash, '#EC4899');
    dev2Id = r3.lastInsertRowid;
    console.log('✅ Created team members');
  } catch {
    const m = db.prepare('SELECT id FROM users WHERE email = ?').get('jane@taskflow.app');
    memberId = m?.id;
    const b = db.prepare('SELECT id FROM users WHERE email = ?').get('bob@taskflow.app');
    dev2Id = b?.id;
  }

  // Create projects
  const p1 = db.prepare('INSERT INTO projects (name, description, color, owner_id, deadline) VALUES (?, ?, ?, ?, ?)').run(
    'Website Redesign', 'Complete overhaul of the company website', '#3B82F6', adminId, '2026-12-31'
  );
  const p2 = db.prepare('INSERT INTO projects (name, description, color, owner_id) VALUES (?, ?, ?, ?)').run(
    'Mobile App', 'React Native mobile application', '#8B5CF6', adminId
  );
  console.log('✅ Created sample projects');

  // Add members
  db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(p1.lastInsertRowid, adminId, 'admin');
  db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(p1.lastInsertRowid, memberId, 'member');
  db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(p1.lastInsertRowid, dev2Id, 'member');
  db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(p2.lastInsertRowid, adminId, 'admin');
  db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(p2.lastInsertRowid, memberId, 'admin');

  // Create tasks
  const tasks = [
    { project_id: p1.lastInsertRowid, title: 'Design new homepage layout', status: 'done', priority: 'high', assigned_to: dev2Id, due_date: '2026-04-01' },
    { project_id: p1.lastInsertRowid, title: 'Implement responsive navigation', status: 'in_progress', priority: 'high', assigned_to: memberId, due_date: '2026-05-10' },
    { project_id: p1.lastInsertRowid, title: 'Write copy for About page', status: 'todo', priority: 'medium', assigned_to: adminId, due_date: '2026-05-20' },
    { project_id: p1.lastInsertRowid, title: 'SEO optimization audit', status: 'review', priority: 'medium', assigned_to: memberId, due_date: '2026-05-08' },
    { project_id: p1.lastInsertRowid, title: 'Performance testing', status: 'todo', priority: 'low', assigned_to: memberId, due_date: '2026-06-01' },
    { project_id: p2.lastInsertRowid, title: 'Set up React Native project', status: 'done', priority: 'urgent', assigned_to: memberId, due_date: '2026-03-15' },
    { project_id: p2.lastInsertRowid, title: 'Authentication flow', status: 'in_progress', priority: 'urgent', assigned_to: memberId, due_date: '2026-05-15' },
    { project_id: p2.lastInsertRowid, title: 'Design system components', status: 'review', priority: 'high', assigned_to: dev2Id, due_date: '2026-05-12' },
  ];

  for (const task of tasks) {
    db.prepare(`INSERT INTO tasks (project_id, title, status, priority, assigned_to, created_by, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      task.project_id, task.title, task.status, task.priority, task.assigned_to, adminId, task.due_date
    );
  }
  console.log(`✅ Created ${tasks.length} sample tasks`);

  console.log('\n🎉 Seed complete!');
  console.log('📧 Login: demo@taskflow.app / demo1234');
  console.log('📧 Member: jane@taskflow.app / member123');
  process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
