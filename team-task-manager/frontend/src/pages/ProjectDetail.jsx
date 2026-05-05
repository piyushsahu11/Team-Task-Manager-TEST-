import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Plus, Settings, Users, List, LayoutGrid, Search, UserPlus, Crown, Trash2, ChevronRight, Calendar, Flag } from 'lucide-react';
import { projectsAPI, tasksAPI, usersAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button, Modal, FormField, Avatar, StatusBadge, PriorityBadge, EmptyState, PageLoader, DropdownMenu } from '../components/common/UI';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

const STATUSES = [
  { key: 'todo', label: 'To Do', color: 'var(--status-todo)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--status-progress)' },
  { key: 'review', label: 'In Review', color: 'var(--status-review)' },
  { key: 'done', label: 'Done', color: 'var(--status-done)' },
];

const PRIORITIES = ['low','medium','high','urgent'];

// ─── Create Task Modal ─────────────────────────────────────────────────────────
function CreateTaskModal({ isOpen, onClose, projectId, members, onCreated, defaultStatus }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium',
    status: defaultStatus || 'todo', assigned_to: '', due_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) setForm(f => ({ ...f, status: defaultStatus || 'todo' }));
  }, [isOpen, defaultStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setErrors({ title: 'Title required' });
    setLoading(true);
    try {
      const res = await tasksAPI.create({
        ...form, project_id: projectId,
        assigned_to: form.assigned_to || null,
        due_date: form.due_date || null
      });
      onCreated(res.data.task);
      toast.success('Task created!');
      onClose();
      setForm({ title: '', description: '', priority: 'medium', status: defaultStatus || 'todo', assigned_to: '', due_date: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Task" size="md">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label="Task Title" error={errors.title} required>
          <input placeholder="What needs to be done?" value={form.title} onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setErrors({}); }} autoFocus />
        </FormField>
        <FormField label="Description">
          <textarea placeholder="Add details (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ resize: 'vertical' }} />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FormField label="Status">
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </FormField>
          <FormField label="Priority">
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FormField label="Assign To">
            <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </FormField>
          <FormField label="Due Date">
            <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          </FormField>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Task</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Add Member Modal ──────────────────────────────────────────────────────────
function AddMemberModal({ isOpen, onClose, projectId, onAdded }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await projectsAPI.addMember(projectId, { email, role });
      onAdded(res.data.member);
      toast.success('Member added!');
      onClose();
      setEmail('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Team Member">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label="Email Address" required hint="User must have a TaskFlow account">
          <input type="email" placeholder="teammate@company.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
        </FormField>
        <FormField label="Role">
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="member">Member — Can view and manage tasks</option>
            <option value="admin">Admin — Full project access</option>
          </select>
        </FormField>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add Member</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, onUpdate, onDelete, members, myRole }) {
  const [dragging, setDragging] = useState(false);

  const priorityColors = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', urgent: '#ef4444' };
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await tasksAPI.update(task.id, { status: newStatus });
      onUpdate(res.data.task);
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await tasksAPI.delete(task.id);
      onDelete(task.id);
      toast.success('Task deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div style={{
      background: 'var(--bg-secondary)', border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
      borderRadius: 'var(--radius)', padding: '12px 14px',
      transition: 'all 0.15s', opacity: dragging ? 0.5 : 1, cursor: 'pointer'
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-focus)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = isOverdue ? 'rgba(239,68,68,0.3)' : 'var(--border)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 3, height: 3, borderRadius: '50%', background: priorityColors[task.priority], marginTop: 7, flexShrink: 0 }} />
        <Link
          to={`/tasks/${task.id}`}
          style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flex: 1, textDecoration: 'none', lineHeight: 1.4 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
        >
          {task.title}
        </Link>
        <DropdownMenu
          trigger={
            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 2px', display: 'flex' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
            </button>
          }
          items={[
            ...STATUSES.filter(s => s.key !== task.status).map(s => ({
              label: `Move to ${s.label}`, onClick: () => handleStatusChange(s.key)
            })),
            { divider: true },
            { label: 'Delete', icon: Trash2, onClick: handleDelete, danger: true }
          ]}
        />
      </div>

      {task.description && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {task.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <PriorityBadge priority={task.priority} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {task.due_date && (
            <span style={{ fontSize: 11, color: isOverdue ? 'var(--accent-red)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Calendar size={10} /> {format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
          {task.assignee_name && (
            <Avatar name={task.assignee_name} color={task.assignee_avatar} size={20} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ status, tasks, onAddTask, onUpdate, onDelete, members, myRole }) {
  const colors = { todo: 'var(--status-todo)', in_progress: 'var(--status-progress)', review: 'var(--status-review)', done: 'var(--status-done)' };

  return (
    <div style={{
      background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
      minWidth: 280, maxHeight: 'calc(100vh - 200px)'
    }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[status.key] }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{status.label}</span>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
          background: 'var(--bg-primary)', padding: '2px 7px', borderRadius: 999
        }}>
          {tasks.length}
        </span>
        {myRole === 'admin' || true ? (
          <button onClick={onAddTask} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2,
            borderRadius: 4, display: 'flex', transition: 'color 0.15s'
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <Plus size={15} />
          </button>
        ) : null}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onUpdate={onUpdate} onDelete={onDelete} members={members} myRole={myRole} />
        ))}
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
            No tasks here
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ProjectDetail() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('board');
  const [search, setSearch] = useState('');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [createStatus, setCreateStatus] = useState('todo');
  const [showMembers, setShowMembers] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        projectsAPI.getOne(projectId),
        tasksAPI.getByProject(projectId)
      ]);
      setProject(projRes.data.project);
      setMembers(projRes.data.members || []);
      setTasks(tasksRes.data.tasks || []);
    } catch {
      toast.error('Project not found');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }, [projectId, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const myRole = project?.my_role || (project?.owner_id === user.id ? 'admin' : 'member');

  const handleTaskCreated = (task) => setTasks(ts => [task, ...ts]);
  const handleTaskUpdate = (updatedTask) => setTasks(ts => ts.map(t => t.id === updatedTask.id ? updatedTask : t));
  const handleTaskDelete = (taskId) => setTasks(ts => ts.filter(t => t.id !== taskId));
  const handleMemberAdded = (member) => setMembers(ms => [...ms, member]);

  const filteredTasks = tasks.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const tasksByStatus = (status) => filteredTasks.filter(t => t.status === status);

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await projectsAPI.removeMember(projectId, memberId);
      setMembers(ms => ms.filter(m => m.id !== memberId));
      toast.success('Member removed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove');
    }
  };

  if (loading) return <div style={{ padding: 32 }}><PageLoader /></div>;
  if (!project) return null;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Link to="/projects" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13 }}>Projects</Link>
          <ChevronRight size={14} color="var(--text-muted)" />
          <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{project.name}</span>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 999, fontWeight: 600,
            background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)',
            marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5
          }}>{myRole}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: project.color }} />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{project.name}</h1>
            {project.description && (
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>— {project.description}</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Members avatars */}
            <div style={{ display: 'flex', cursor: 'pointer' }} onClick={() => setShowMembers(!showMembers)}>
              {members.slice(0, 4).map((m, i) => (
                <div key={m.id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 4 - i }}>
                  <Avatar name={m.name} color={m.avatar_color} size={28} />
                </div>
              ))}
              {members.length > 4 && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-hover)',
                  border: '2px solid var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: 'var(--text-muted)', marginLeft: -8, zIndex: 0
                }}>
                  +{members.length - 4}
                </div>
              )}
            </div>

            {myRole === 'admin' && (
              <Button size="sm" variant="secondary" onClick={() => setShowAddMember(true)} icon={<UserPlus size={13} />}>
                Add
              </Button>
            )}

            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: 3 }}>
              {[['board', LayoutGrid], ['list', List]].map(([v, Icon]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: view === v ? 'var(--bg-card)' : 'transparent',
                    color: view === v ? 'var(--accent-blue)' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', transition: 'all 0.15s'
                  }}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>

            <Button onClick={() => { setCreateStatus('todo'); setShowCreateTask(true); }} icon={<Plus size={14} />} size="sm">
              Task
            </Button>
          </div>
        </div>

        {/* Members Panel */}
        {showMembers && (
          <div style={{
            marginTop: 12, padding: 16, background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
            animation: 'fadeIn 0.15s ease'
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Team Members</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {members.map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                  background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)'
                }}>
                  <Avatar name={m.name} color={m.avatar_color} size={24} />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{m.name}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 3 }}>
                      {m.role === 'admin' && <Crown size={9} />}{m.role}
                    </p>
                  </div>
                  {myRole === 'admin' && m.id !== project.owner_id && m.id !== user.id && (
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search bar */}
        <div style={{ marginTop: 12, position: 'relative', maxWidth: 300 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Filter tasks..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30, fontSize: 13 }} />
        </div>
      </div>

      {/* Board View */}
      {view === 'board' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px', display: 'flex', gap: 16 }}>
          {STATUSES.map(status => (
            <KanbanColumn
              key={status.key}
              status={status}
              tasks={tasksByStatus(status.key)}
              members={members}
              myRole={myRole}
              onAddTask={() => { setCreateStatus(status.key); setShowCreateTask(true); }}
              onUpdate={handleTaskUpdate}
              onDelete={handleTaskDelete}
            />
          ))}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
          {filteredTasks.length === 0 ? (
            <EmptyState icon={CheckSquare} title="No tasks" description="Create your first task to get started." action={<Button onClick={() => setShowCreateTask(true)} icon={<Plus size={14} />}>Create Task</Button>} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {['todo','in_progress','review','done'].map(status => {
                const st = STATUSES.find(s => s.key === status);
                const sts = tasksByStatus(status);
                if (sts.length === 0) return null;
                return (
                  <div key={status} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{st.label}</span>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>({sts.length})</span>
                    </div>
                    {sts.map(task => (
                      <Link key={task.id} to={`/tasks/${task.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)', marginBottom: 4, transition: 'all 0.15s'
                        }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                        >
                          <PriorityBadge priority={task.priority} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>{task.title}</span>
                          {task.assignee_name && <Avatar name={task.assignee_name} color={task.assignee_avatar} size={22} />}
                          {task.due_date && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Calendar size={10} /> {format(new Date(task.due_date), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <CreateTaskModal isOpen={showCreateTask} onClose={() => setShowCreateTask(false)} projectId={projectId} members={members} onCreated={handleTaskCreated} defaultStatus={createStatus} />
      <AddMemberModal isOpen={showAddMember} onClose={() => setShowAddMember(false)} projectId={projectId} onAdded={handleMemberAdded} />
    </div>
  );
}
