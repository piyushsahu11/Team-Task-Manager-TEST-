import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Edit2, Trash2, Send, Calendar, Flag, User, Clock, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { tasksAPI, projectsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button, Avatar, StatusBadge, PriorityBadge, FormField, Modal, PageLoader } from '../components/common/UI';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

const STATUSES = ['todo', 'in_progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

function EditTaskModal({ isOpen, onClose, task, members, onUpdated }) {
  const [form, setForm] = useState({
    title: task.title, description: task.description || '',
    status: task.status, priority: task.priority,
    assigned_to: task.assigned_to || '', due_date: task.due_date ? task.due_date.split('T')[0] : ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) setForm({
      title: task.title, description: task.description || '',
      status: task.status, priority: task.priority,
      assigned_to: task.assigned_to || '', due_date: task.due_date ? task.due_date.split('T')[0] : ''
    });
  }, [isOpen, task]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await tasksAPI.update(task.id, { ...form, assigned_to: form.assigned_to || null, due_date: form.due_date || null });
      onUpdated(res.data.task);
      toast.success('Task updated!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Task" size="md">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label="Title" required>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </FormField>
        <FormField label="Description">
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} style={{ resize: 'vertical' }} />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FormField label="Status">
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
            </select>
          </FormField>
          <FormField label="Priority">
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </FormField>
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
          <Button type="submit" loading={loading}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function TaskDetail() {
  const { taskId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    Promise.all([tasksAPI.getOne(taskId)])
      .then(([taskRes]) => {
        setTask(taskRes.data.task);
        setComments(taskRes.data.comments || []);
        return projectsAPI.getOne(taskRes.data.task.project_id);
      })
      .then(projRes => setMembers(projRes.data.members || []))
      .catch(() => { toast.error('Task not found'); navigate('/tasks'); })
      .finally(() => setLoading(false));
  }, [taskId]);

  const handleStatusChange = async (status) => {
    try {
      const res = await tasksAPI.update(taskId, { status });
      setTask(res.data.task);
      toast.success(`Moved to ${status.replace('_', ' ')}`);
    } catch { toast.error('Update failed'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await tasksAPI.delete(taskId);
      toast.success('Task deleted');
      navigate(`/projects/${task.project_id}`);
    } catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const res = await tasksAPI.addComment(taskId, { content: comment });
      setComments(cs => [...cs, res.data.comment]);
      setComment('');
    } catch { toast.error('Failed to add comment'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div style={{ padding: 32 }}><PageLoader /></div>;
  if (!task) return null;

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const isDone = task.status === 'done';

  const statusIcon = isDone
    ? <CheckCircle2 size={20} color="var(--status-done)" />
    : <Circle size={20} color="var(--text-muted)" />;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900, animation: 'fadeIn 0.25s ease' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, fontSize: 13, color: 'var(--text-muted)' }}>
        <Link to="/projects" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Projects</Link>
        <ChevronRight size={13} />
        <Link to={`/projects/${task.project_id}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{task.project_name}</Link>
        <ChevronRight size={13} />
        <span style={{ color: 'var(--text-primary)' }}>{task.title}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
        {/* Main */}
        <div>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
            <button
              onClick={() => handleStatusChange(isDone ? 'todo' : 'done')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 3, flexShrink: 0 }}
            >
              {statusIcon}
            </button>
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontSize: 22, fontWeight: 700, color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                lineHeight: 1.3, textDecoration: isDone ? 'line-through' : 'none', marginBottom: 8
              }}>
                {task.title}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                {isOverdue && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent-red)' }}>
                    <AlertCircle size={12} /> Overdue
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" variant="secondary" icon={<Edit2 size={13} />} onClick={() => setShowEdit(true)}>Edit</Button>
              <Button size="sm" variant="danger" icon={<Trash2 size={13} />} onClick={handleDelete}>Delete</Button>
            </div>
          </div>

          {/* Description */}
          <div className="card" style={{ marginBottom: 24, minHeight: 80 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Description</h3>
            {task.description ? (
              <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{task.description}</p>
            ) : (
              <p style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic' }}>No description provided.</p>
            )}
          </div>

          {/* Status Switcher */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Move Task</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['todo', 'in_progress', 'review', 'done'].map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  style={{
                    padding: '6px 14px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 500,
                    cursor: s === task.status ? 'default' : 'pointer', fontFamily: 'var(--font-sans)',
                    border: `1px solid ${s === task.status ? 'var(--accent-blue)' : 'var(--border)'}`,
                    background: s === task.status ? 'var(--accent-blue-dim)' : 'transparent',
                    color: s === task.status ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    transition: 'all 0.15s'
                  }}
                >
                  {s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Comments ({comments.length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
              {comments.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                  No comments yet. Start the conversation.
                </p>
              ) : (
                comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                    <Avatar name={c.name} color={c.avatar_color} size={30} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-hover)',
                        padding: '10px 14px', borderRadius: 'var(--radius)', lineHeight: 1.6,
                        whiteSpace: 'pre-wrap', border: '1px solid var(--border)'
                      }}>
                        {c.content}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleComment} style={{ display: 'flex', gap: 10 }}>
              <Avatar name={user.name} color={user.avatar_color} size={30} />
              <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                <textarea
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={2}
                  style={{ flex: 1, resize: 'none' }}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleComment(e); }}
                />
                <Button type="submit" loading={submitting} icon={<Send size={14} />} style={{ alignSelf: 'flex-end' }}>
                  Send
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16 }}>Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Assigned To</p>
                {task.assignee_name ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={task.assignee_name} color={task.assignee_avatar} size={26} />
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{task.assignee_name}</span>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Unassigned</p>
                )}
              </div>

              <div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Created By</p>
                <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{task.creator_name}</p>
              </div>

              {task.due_date && (
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Due Date</p>
                  <p style={{ fontSize: 13, color: isOverdue ? 'var(--accent-red)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Calendar size={13} />
                    {format(new Date(task.due_date), 'MMM d, yyyy')}
                    {isOverdue && ' (overdue)'}
                  </p>
                </div>
              )}

              {task.completed_at && (
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Completed</p>
                  <p style={{ fontSize: 13, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CheckCircle2 size={13} />
                    {format(new Date(task.completed_at), 'MMM d, yyyy')}
                  </p>
                </div>
              )}

              <div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Created</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                </p>
              </div>

              <div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Project</p>
                <Link to={`/projects/${task.project_id}`} style={{ fontSize: 13, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: task.project_color }} />
                  {task.project_name}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditTaskModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        task={task}
        members={members}
        onUpdated={(t) => { setTask(t); setShowEdit(false); }}
      />
    </div>
  );
}
