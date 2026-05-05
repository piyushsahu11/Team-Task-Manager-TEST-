import { useState } from 'react';
import { User, Mail, Lock, Palette, Save } from 'lucide-react';
import { authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button, FormField, Avatar } from '../components/common/UI';
import toast from 'react-hot-toast';

const AVATAR_COLORS = [
  '#EF4444','#F97316','#EAB308','#22C55E',
  '#06B6D4','#3B82F6','#8B5CF6','#EC4899'
];

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [color, setColor] = useState(user.avatar_color || '#3B82F6');
  const [pw, setPw] = useState({ current: '', new: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.length < 2) return setErrors({ name: 'Name must be at least 2 characters' });
    setLoading(true);
    try {
      const res = await authAPI.updateProfile({ name, avatar_color: color });
      updateUser(res.data.user);
      toast.success('Profile updated!');
      setErrors({});
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally { setLoading(false); }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    const e2 = {};
    if (!pw.current) e2.current = 'Current password required';
    if (!pw.new || pw.new.length < 6) e2.new = 'Min 6 characters';
    if (pw.new !== pw.confirm) e2.confirm = 'Passwords do not match';
    if (Object.keys(e2).length) return setErrors(e2);

    setPwLoading(true);
    try {
      await authAPI.updateProfile({ current_password: pw.current, new_password: pw.new });
      toast.success('Password changed!');
      setPw({ current: '', new: '', confirm: '' });
      setErrors({});
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally { setPwLoading(false); }
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 640, animation: 'fadeIn 0.25s ease' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 28 }}>Settings</h1>

      {/* Profile Section */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Profile</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Update your name and avatar color</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <Avatar name={name || user.name} color={color} size={64} />
          <div>
            <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.email}</p>
          </div>
        </div>

        <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <FormField label="Display Name" error={errors.name} required>
            <div style={{ position: 'relative' }}>
              <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input value={name} onChange={e => { setName(e.target.value); setErrors({}); }} style={{ paddingLeft: 36 }} />
            </div>
          </FormField>

          <FormField label="Email (read-only)">
            <div style={{ position: 'relative' }}>
              <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input value={user.email} disabled style={{ paddingLeft: 36, opacity: 0.5 }} />
            </div>
          </FormField>

          <FormField label="Avatar Color">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', background: c,
                    border: color === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                    cursor: 'pointer', outline: color === c ? '2px solid var(--bg-card)' : 'none',
                    transition: 'all 0.15s', transform: color === c ? 'scale(1.15)' : 'scale(1)'
                  }}
                />
              ))}
            </div>
          </FormField>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" loading={loading} icon={<Save size={14} />}>Save Profile</Button>
          </div>
        </form>
      </div>

      {/* Password Section */}
      <div className="card">
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Change Password</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Minimum 6 characters</p>

        <form onSubmit={handlePasswordSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormField label="Current Password" error={errors.current} required>
            <div style={{ position: 'relative' }}>
              <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                value={pw.current}
                onChange={e => { setPw(p => ({ ...p, current: e.target.value })); setErrors({}); }}
                style={{ paddingLeft: 36 }}
                placeholder="Enter current password"
              />
            </div>
          </FormField>
          <FormField label="New Password" error={errors.new} required>
            <div style={{ position: 'relative' }}>
              <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                value={pw.new}
                onChange={e => { setPw(p => ({ ...p, new: e.target.value })); setErrors({}); }}
                style={{ paddingLeft: 36 }}
                placeholder="Choose a new password"
              />
            </div>
          </FormField>
          <FormField label="Confirm New Password" error={errors.confirm} required>
            <div style={{ position: 'relative' }}>
              <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                value={pw.confirm}
                onChange={e => { setPw(p => ({ ...p, confirm: e.target.value })); setErrors({}); }}
                style={{ paddingLeft: 36 }}
                placeholder="Confirm your new password"
              />
            </div>
          </FormField>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" loading={pwLoading} icon={<Lock size={14} />}>Update Password</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
