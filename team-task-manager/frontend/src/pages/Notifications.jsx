import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Folder, ClipboardList, Info } from 'lucide-react';
import { usersAPI } from '../utils/api';
import { Button, PageLoader } from '../components/common/UI';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersAPI.getNotifications()
      .then(res => setNotifications(res.data.notifications || []))
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    await usersAPI.markNotificationsRead();
    setNotifications(ns => ns.map(n => ({ ...n, is_read: 1 })));
    toast.success('All marked as read');
  };

  const getIcon = (type) => {
    if (type === 'task_assigned') return <ClipboardList size={16} color="var(--accent-blue)" />;
    if (type === 'project_invite') return <Folder size={16} color="var(--accent-green)" />;
    return <Info size={16} color="var(--text-muted)" />;
  };

  const unread = notifications.filter(n => !n.is_read).length;

  if (loading) return <div style={{ padding: 32 }}><PageLoader /></div>;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 700, animation: 'fadeIn 0.25s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Notifications</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {unread > 0 ? `${unread} unread` : 'All caught up!'}
          </p>
        </div>
        {unread > 0 && (
          <Button size="sm" variant="secondary" icon={<CheckCheck size={14} />} onClick={markAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Bell size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>No notifications yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {notifications.map(n => (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px',
              background: n.is_read ? 'var(--bg-card)' : 'rgba(59,130,246,0.05)',
              border: `1px solid ${n.is_read ? 'var(--border)' : 'rgba(59,130,246,0.2)'}`,
              borderRadius: 'var(--radius-lg)', transition: 'all 0.15s'
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-hover)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                {getIcon(n.type)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 3 }}>{n.message}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
              {!n.is_read && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-blue)', flexShrink: 0, marginTop: 4 }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
