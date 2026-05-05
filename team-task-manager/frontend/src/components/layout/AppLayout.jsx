import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, FolderKanban, CheckSquare, Bell, Settings, 
  LogOut, Plus, ChevronRight, Menu, X, Zap, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/UI';
import { usersAPI, projectsAPI } from '../../utils/api';

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projects, setProjects] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    projectsAPI.getAll().then(res => setProjects(res.data.projects || []));
    usersAPI.getNotifications().then(res => {
      const unread = res.data.notifications?.filter(n => !n.is_read).length || 0;
      setUnreadCount(unread);
    });
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: CheckSquare, label: 'My Tasks', path: '/tasks' },
    { icon: Bell, label: 'Notifications', path: '/notifications', badge: unreadCount },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 40, display: 'none'
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '260px' : '64px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0,
        transition: 'width 0.2s ease', zIndex: 50,
        overflow: 'hidden'
      }}>
        {/* Logo */}
        <div style={{
          padding: sidebarOpen ? '20px 20px 16px' : '20px 16px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
          minHeight: '64px'
        }}>
          <div style={{
            width: 32, height: 32, background: 'var(--accent-blue)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <Zap size={18} color="#fff" />
          </div>
          {sidebarOpen && (
            <div>
              <span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', letterSpacing: -0.5 }}>
                TaskFlow
              </span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer', padding: 4,
              borderRadius: 4, display: 'flex', alignItems: 'center', flexShrink: 0
            }}
          >
            {sidebarOpen ? <ChevronRight size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 8px', flex: 1, overflow: 'auto' }}>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: sidebarOpen ? '9px 12px' : '9px',
                borderRadius: 'var(--radius)', marginBottom: 2,
                color: isActive(item.path) ? 'var(--accent-blue)' : 'var(--text-secondary)',
                background: isActive(item.path) ? 'var(--accent-blue-dim)' : 'transparent',
                textDecoration: 'none', transition: 'all 0.15s',
                fontSize: '14px', fontWeight: 500, position: 'relative',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
              }}
              onMouseEnter={e => { if (!isActive(item.path)) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { if (!isActive(item.path)) e.currentTarget.style.background = 'transparent'; }}
            >
              <item.icon size={17} style={{ flexShrink: 0 }} />
              {sidebarOpen && <span>{item.label}</span>}
              {item.badge > 0 && (
                <span style={{
                  marginLeft: 'auto', background: 'var(--accent-red)', color: '#fff',
                  borderRadius: '999px', fontSize: 10, fontWeight: 700,
                  padding: '1px 6px', minWidth: 18, textAlign: 'center'
                }}>{item.badge}</span>
              )}
            </Link>
          ))}

          {/* Projects Section */}
          {sidebarOpen && (
            <div style={{ marginTop: 20 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 12px', marginBottom: 6
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Projects
                </span>
                <Link to="/projects/new" style={{ color: 'var(--text-muted)', display: 'flex', textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <Plus size={14} />
                </Link>
              </div>
              {projects.slice(0, 8).map(project => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 12px', borderRadius: 'var(--radius)', marginBottom: 1,
                    color: location.pathname === `/projects/${project.id}` ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: location.pathname === `/projects/${project.id}` ? 'var(--bg-hover)' : 'transparent',
                    textDecoration: 'none', fontSize: '13px', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => {
                    e.currentTarget.style.background =
                      location.pathname === `/projects/${project.id}` ? 'var(--bg-hover)' : 'transparent';
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: project.color, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
                </Link>
              ))}
              <Link
                to="/projects"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 12px', borderRadius: 'var(--radius)',
                  color: 'var(--text-muted)', textDecoration: 'none', fontSize: '13px',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <FolderKanban size={14} /> All projects
              </Link>
            </div>
          )}
        </nav>

        {/* User */}
        <div style={{
          padding: sidebarOpen ? '12px 12px' : '12px 8px',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <Link to="/settings" style={{ display: 'flex', flexShrink: 0, textDecoration: 'none' }}>
            <Avatar name={user?.name} color={user?.avatar_color} size={34} />
          </Link>
          {sidebarOpen && (
            <>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </p>
              </div>
              <button onClick={handleLogout} style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex',
                transition: 'color 0.15s'
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-red)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main style={{
        flex: 1,
        marginLeft: sidebarOpen ? '260px' : '64px',
        transition: 'margin-left 0.2s ease',
        minHeight: '100vh',
        background: 'var(--bg-primary)'
      }}>
        {children}
      </main>
    </div>
  );
}
