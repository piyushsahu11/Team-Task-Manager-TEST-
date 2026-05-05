import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Search, Filter, Calendar, AlertCircle, Clock } from 'lucide-react';
import { tasksAPI } from '../utils/api';
import { StatusBadge, PriorityBadge, Avatar, EmptyState, PageLoader } from '../components/common/UI';
import { format, formatDistanceToNow, isPast, isToday } from 'date-fns';

export default function MyTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showOverdue, setShowOverdue] = useState(false);
  const [sortBy, setSortBy] = useState('due_date');

  useEffect(() => {
    const params = {};
    if (filterStatus) params.status = filterStatus;
    if (filterPriority) params.priority = filterPriority;
    if (showOverdue) params.overdue = true;

    tasksAPI.getAll(params)
      .then(res => setTasks(res.data.tasks || []))
      .finally(() => setLoading(false));
  }, [filterStatus, filterPriority, showOverdue]);

  const filtered = tasks.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.project_name?.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'due_date') {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    }
    if (sortBy === 'priority') {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const statuses = [
    { value: '', label: 'All Status' },
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'In Review' },
    { value: 'done', label: 'Done' },
  ];
  const priorities = [
    { value: '', label: 'All Priority' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  const overdueCount = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== 'done').length;

  if (loading) return <div style={{ padding: 32 }}><PageLoader /></div>;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, animation: 'fadeIn 0.25s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>My Tasks</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} total
          {overdueCount > 0 && <span style={{ color: 'var(--accent-red)', marginLeft: 8 }}>• {overdueCount} overdue</span>}
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto' }}>
          {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ width: 'auto' }}>
          {priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 'auto' }}>
          <option value="due_date">Sort: Due Date</option>
          <option value="priority">Sort: Priority</option>
          <option value="created_at">Sort: Created</option>
        </select>
        <button
          onClick={() => setShowOverdue(!showOverdue)}
          style={{
            padding: '8px 14px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', border: `1px solid ${showOverdue ? 'var(--accent-red)' : 'var(--border)'}`,
            background: showOverdue ? 'rgba(239,68,68,0.1)' : 'transparent',
            color: showOverdue ? 'var(--accent-red)' : 'var(--text-secondary)',
            fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.15s'
          }}
        >
          <AlertCircle size={13} /> Overdue {overdueCount > 0 && `(${overdueCount})`}
        </button>
      </div>

      {/* Task Table */}
      {sorted.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No tasks found" description="Adjust your filters or check back when you've been assigned tasks." />
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 120px 100px 130px 100px',
            padding: '10px 18px', borderBottom: '1px solid var(--border)',
            fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5
          }}>
            <span>Task</span>
            <span>Status</span>
            <span>Priority</span>
            <span>Due Date</span>
            <span>Assigned</span>
          </div>

          {sorted.map((task, i) => {
            const isOverdueTask = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'done';
            const todayTask = task.due_date && isToday(new Date(task.due_date));

            return (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 120px 100px 130px 100px',
                    padding: '13px 18px',
                    borderBottom: i < sorted.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    background: isOverdueTask ? 'rgba(239,68,68,0.03)' : 'transparent',
                    transition: 'background 0.15s', alignItems: 'center'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = isOverdueTask ? 'rgba(239,68,68,0.03)' : 'transparent'}
                >
                  <div style={{ overflow: 'hidden', paddingRight: 16 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 500, color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: task.status === 'done' ? 'line-through' : 'none',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2
                    }}>
                      {task.title}
                    </p>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: task.project_color }} />
                      {task.project_name}
                    </span>
                  </div>
                  <div><StatusBadge status={task.status} /></div>
                  <div><PriorityBadge priority={task.priority} /></div>
                  <div>
                    {task.due_date ? (
                      <span style={{
                        fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                        color: isOverdueTask ? 'var(--accent-red)' : todayTask ? 'var(--accent-yellow)' : 'var(--text-muted)'
                      }}>
                        <Clock size={11} />
                        {isOverdueTask ? `${formatDistanceToNow(new Date(task.due_date))} ago` :
                          todayTask ? 'Today' : format(new Date(task.due_date), 'MMM d, yyyy')}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No due date</span>
                    )}
                  </div>
                  <div>
                    {task.assignee_name ? (
                      <Avatar name={task.assignee_name} color={task.assignee_avatar} size={26} />
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
