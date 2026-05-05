import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, Users, CheckSquare, Search, MoreVertical, Archive, Trash2, Edit2, Calendar } from 'lucide-react';
import { projectsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button, Modal, FormField, EmptyState, DropdownMenu, PageLoader } from '../components/common/UI';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const PROJECT_COLORS = ['#3B82F6','#06B6D4','#22C55E','#F59E0B','#EF4444','#8B5CF6','#EC4899','#F97316'];

function CreateProjectModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', color: '#3B82F6', deadline: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setErrors({ name: 'Project name required' });
    setLoading(true);
    try {
      const res = await projectsAPI.create(form);
      onCreated(res.data.project);
      toast.success('Project created!');
      onClose();
      setForm({ name: '', description: '', color: '#3B82F6', deadline: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Project">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <FormField label="Project Name" error={errors.name} required>
          <input
            placeholder="e.g. Website Redesign"
            value={form.name}
            onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors({}); }}
            autoFocus
          />
        </FormField>

        <FormField label="Description">
          <textarea
            placeholder="What is this project about? (optional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </FormField>

        <FormField label="Color">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PROJECT_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setForm(f => ({ ...f, color }))}
                style={{
                  width: 28, height: 28, borderRadius: '50%', background: color,
                  border: form.color === color ? '2px solid var(--text-primary)' : '2px solid transparent',
                  cursor: 'pointer', outline: form.color === color ? '2px solid var(--bg-card)' : 'none',
                  transition: 'all 0.15s'
                }}
              />
            ))}
          </div>
        </FormField>

        <FormField label="Deadline (optional)">
          <input
            type="date"
            value={form.deadline}
            onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
          />
        </FormField>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Project</Button>
        </div>
      </form>
    </Modal>
  );
}

function ProjectCard({ project, onDelete, currentUserId }) {
  const isOwner = project.owner_id === currentUserId;
  const role = project.my_role || (isOwner ? 'admin' : 'member');
  const pct = project.task_count ? Math.round((project.done_count / project.task_count) * 100) : 0;

  const statusColors = { active: 'var(--accent-green)', completed: 'var(--accent-blue)', archived: 'var(--text-muted)' };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    try {
      await projectsAPI.delete(project.id);
      onDelete(project.id);
      toast.success('Project deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="card" style={{ transition: 'all 0.2s', cursor: 'pointer', position: 'relative' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = project.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; }}
    >
      {/* Color accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: project.color, borderRadius: '12px 12px 0 0' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              <Link to={`/projects/${project.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                {project.name}
              </Link>
            </h3>
            <span style={{
              fontSize: 10, padding: '2px 7px', borderRadius: '999px', fontWeight: 600,
              background: `${statusColors[project.status]}20`, color: statusColors[project.status],
              textTransform: 'capitalize', letterSpacing: 0.5
            }}>
              {project.status}
            </span>
          </div>
          {project.description && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {project.description}
            </p>
          )}
        </div>
        {isOwner && (
          <DropdownMenu
            trigger={
              <button style={{ padding: 4, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 4 }}>
                <MoreVertical size={15} />
              </button>
            }
            items={[
              { label: 'Edit', icon: Edit2, onClick: () => window.location.href = `/projects/${project.id}/settings` },
              { divider: true },
              { label: 'Delete', icon: Trash2, onClick: handleDelete, danger: true },
            ]}
          />
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <CheckSquare size={12} /> {project.task_count || 0} tasks
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Users size={12} /> {project.member_count || 1} members
        </span>
        {project.deadline && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={12} /> {format(new Date(project.deadline), 'MMM d')}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          {role}
        </span>
      </div>

      {/* Progress */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Progress</span>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{pct}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    projectsAPI.getAll()
      .then(res => setProjects(res.data.projects || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.status === filter;
    return matchSearch && matchFilter;
  });

  if (loading) return <div style={{ padding: 32 }}><PageLoader /></div>;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Projects</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button onClick={() => setShowCreate(true)} icon={<Plus size={15} />}>
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        {['all', 'active', 'completed', 'archived'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
              background: filter === f ? 'var(--accent-blue)' : 'transparent',
              color: filter === f ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${filter === f ? 'transparent' : 'var(--border)'}`,
              textTransform: 'capitalize', fontFamily: 'var(--font-sans)'
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filtered.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              currentUserId={user.id}
              onDelete={id => setProjects(ps => ps.filter(p => p.id !== id))}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FolderKanban}
          title={search ? 'No projects found' : 'No projects yet'}
          description={search ? 'Try a different search term' : 'Create your first project to start collaborating with your team.'}
          action={!search && <Button onClick={() => setShowCreate(true)} icon={<Plus size={15} />}>Create Project</Button>}
        />
      )}

      <CreateProjectModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={p => { setProjects(ps => [p, ...ps]); navigate(`/projects/${p.id}`); }}
      />
    </div>
  );
}
