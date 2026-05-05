import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Clock, AlertCircle, TrendingUp, Calendar, FolderKanban, ArrowRight } from 'lucide-react';
import { tasksAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { StatCard, StatusBadge, PriorityBadge, PageLoader, EmptyState } from '../components/common/UI';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';

function DueDateLabel({ date }) {
  if (!date) return null;
  const d = new Date(date);
  const overdue = isPast(d) && !isToday(d);
  const today = isToday(d);
  const tomorrow = isTomorrow(d);
  
  const color = overdue ? 'var(--accent-red)' : today ? 'var(--accent-yellow)' : tomorrow ? 'var(--accent-orange)' : 'var(--text-muted)';
  const label = overdue ? `Overdue ${formatDistanceToNow(d, { addSuffix: true })}` :
    today ? 'Due today' : tomorrow ? 'Due tomorrow' : format(d, 'MMM d');

  return (
    <span style={{ fontSize: 11, color, display: 'flex', alignItems: 'center', gap: 3 }}>
      <Clock size={10} /> {label}
    </span>
  );
}

function TaskCard({ task }) {
  return (
    <Link to={`/tasks/${task.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        padding: '12px 16px', background: 'var(--bg-hover)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)', transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', gap: 12
      }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--accent-blue)';
          e.currentTarget.style.background = 'var(--bg-card)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.background = 'var(--bg-hover)';
        }}
      >
        <StatusBadge status={task.status} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <span style={{
              fontSize: 11, color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: 3
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: task.project_color }} />
              {task.project_name}
            </span>
            <DueDateLabel date={task.due_date} />
          </div>
        </div>
        <PriorityBadge priority={task.priority} />
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksAPI.getDashboard()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return (
    <div style={{ padding: 32 }}>
      <div style={{ height: 24, width: 300, marginBottom: 32 }} className="skeleton" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[1,2,3,4].map(i => <div key={i} style={{ height: 90 }} className="skeleton" />)}
      </div>
      <PageLoader />
    </div>
  );

  const { myTaskStats, recentTasks, overdueTasks, projectStats, activityFeed } = data || {};

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280, animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          {greeting}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
          {myTaskStats?.overdue > 0 && (
            <span style={{ marginLeft: 12, color: 'var(--accent-red)', fontSize: 13 }}>
              ⚠ {myTaskStats.overdue} overdue task{myTaskStats.overdue > 1 ? 's' : ''}
            </span>
          )}
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Tasks" value={myTaskStats?.total || 0} icon={CheckSquare} color="var(--accent-blue)" />
        <StatCard label="In Progress" value={myTaskStats?.in_progress || 0} icon={TrendingUp} color="var(--accent-cyan)" />
        <StatCard label="In Review" value={myTaskStats?.review || 0} icon={Clock} color="var(--accent-yellow)" />
        <StatCard label="Overdue" value={myTaskStats?.overdue || 0} icon={AlertCircle} color="var(--accent-red)" />
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        {/* My Tasks */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>My Active Tasks</h2>
            <Link to="/tasks" style={{ fontSize: 13, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentTasks?.length > 0 ? (
              recentTasks.map(task => <TaskCard key={task.id} task={task} />)
            ) : (
              <EmptyState
                icon={CheckSquare}
                title="No active tasks"
                description="You're all caught up! Tasks assigned to you will appear here."
              />
            )}
          </div>

          {/* Overdue Alert */}
          {overdueTasks?.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent-red)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={16} /> Overdue Tasks
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {overdueTasks.map(task => <TaskCard key={task.id} task={task} />)}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Task Status Distribution */}
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Task Status</h3>
            {[
              { label: 'To Do', value: myTaskStats?.todo || 0, color: 'var(--status-todo)', key: 'todo' },
              { label: 'In Progress', value: myTaskStats?.in_progress || 0, color: 'var(--status-progress)', key: 'in_progress' },
              { label: 'In Review', value: myTaskStats?.review || 0, color: 'var(--status-review)', key: 'review' },
              { label: 'Done', value: myTaskStats?.done || 0, color: 'var(--status-done)', key: 'done' },
            ].map(item => {
              const pct = myTaskStats?.total ? Math.round((item.value / myTaskStats.total) * 100) : 0;
              return (
                <div key={item.key} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {item.value}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: item.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Projects */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Projects</h3>
              <Link to="/projects" style={{ fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'none' }}>View all</Link>
            </div>
            {projectStats?.length > 0 ? (
              projectStats.map(p => {
                const pct = p.total_tasks ? Math.round((p.done_tasks / p.total_tasks) * 100) : 0;
                return (
                  <Link key={p.id} to={`/projects/${p.id}`} style={{ display: 'block', marginBottom: 12, textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{pct}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </Link>
                );
              })
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                No projects yet. <Link to="/projects/new">Create one →</Link>
              </p>
            )}
          </div>

          {/* Recent Activity */}
          {activityFeed?.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>Recent Activity</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activityFeed.slice(0, 5).map(item => (
                  <Link key={item.id} to={`/tasks/${item.id}`} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    textDecoration: 'none', padding: '6px 0',
                    borderBottom: '1px solid var(--border-subtle)'
                  }}>
                    <StatusBadge status={item.status} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
