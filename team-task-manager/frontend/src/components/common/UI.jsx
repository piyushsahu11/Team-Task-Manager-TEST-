import { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';

// ─── Button ───────────────────────────────────────────────────────────────────
export function Button({ 
  children, variant = 'primary', size = 'md', loading, disabled, 
  icon, fullWidth, style, ...props 
}) {
  const styles = {
    primary: {
      background: 'var(--accent-blue)', color: '#fff',
      border: '1px solid transparent',
    },
    secondary: {
      background: 'transparent', color: 'var(--text-primary)',
      border: '1px solid var(--border)',
    },
    danger: {
      background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)',
      border: '1px solid rgba(239,68,68,0.3)',
    },
    ghost: {
      background: 'transparent', color: 'var(--text-secondary)',
      border: '1px solid transparent',
    },
    success: {
      background: 'rgba(34,197,94,0.1)', color: 'var(--accent-green)',
      border: '1px solid rgba(34,197,94,0.3)',
    },
  };
  const sizes = {
    sm: { padding: '5px 10px', fontSize: '12px', gap: '4px' },
    md: { padding: '8px 16px', fontSize: '14px', gap: '6px' },
    lg: { padding: '11px 22px', fontSize: '15px', gap: '8px' },
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'var(--radius)', fontWeight: 500, fontFamily: 'var(--font-sans)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s',
        width: fullWidth ? '100%' : 'auto',
        whiteSpace: 'nowrap',
        ...styles[variant],
        ...sizes[size],
        ...style,
      }}
      onMouseEnter={e => {
        if (!disabled && !loading) {
          e.currentTarget.style.filter = 'brightness(1.1)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.filter = '';
        e.currentTarget.style.transform = '';
      }}
    >
      {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : icon}
      {children}
    </button>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!isOpen) return null;

  const maxWidths = { sm: '400px', md: '560px', lg: '720px', xl: '900px' };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '20px', animation: 'fadeIn 0.15s ease'
      }}
    >
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: maxWidths[size],
        maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-lg)',
        animation: 'fadeIn 0.2s ease'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--border)'
        }}>
          <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', padding: '4px', borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center'
          }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ name = '?', color = '#3B82F6', size = 32, src }) {
  const initials = name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: src ? 'transparent' : color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: '#fff',
      flexShrink: 0, overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
      boxShadow: '0 0 0 2px var(--bg-card)'
    }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </div>
  );
}

// ─── Form Field ───────────────────────────────────────────────────────────────
export function FormField({ label, error, children, required, hint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
          {label} {required && <span style={{ color: 'var(--accent-red)' }}>*</span>}
        </label>
      )}
      {children}
      {hint && !error && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{hint}</span>}
      {error && <span style={{ fontSize: '12px', color: 'var(--accent-red)' }}>{error}</span>}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const labels = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
  return <span className={`badge badge-${status}`}>{labels[status] || status}</span>;
}

export function PriorityBadge({ priority }) {
  const colors = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', urgent: '#ef4444' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 8px', borderRadius: '999px', fontSize: '11px',
      fontWeight: 600, letterSpacing: '0.3px', textTransform: 'capitalize',
      background: `${colors[priority]}20`, color: colors[priority]
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: colors[priority] }} />
      {priority}
    </span>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 20px', textAlign: 'center', gap: '16px'
    }}>
      {Icon && (
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--bg-hover)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)'
        }}>
          <Icon size={28} />
        </div>
      )}
      <div>
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</p>
        {description && <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, color = 'var(--accent-blue)', trend }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 'var(--radius-lg)',
        background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, flexShrink: 0
      }}>
        <Icon size={22} />
      </div>
      <div>
        <p style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 4 }}>{label}</p>
      </div>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 24 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid var(--border)`,
      borderTopColor: 'var(--accent-blue)',
      animation: 'spin 0.8s linear infinite',
      flexShrink: 0
    }} />
  );
}

export function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
      <Spinner size={32} />
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select({ options, ...props }) {
  return (
    <select {...props}>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// ─── Dropdown Menu ────────────────────────────────────────────────────────────
export function DropdownMenu({ trigger, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
          minWidth: 180, zIndex: 100, overflow: 'hidden',
          animation: 'fadeIn 0.15s ease'
        }}>
          {items.map((item, i) => (
            item.divider ? (
              <div key={i} style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            ) : (
              <button
                key={i}
                onClick={() => { item.onClick(); setOpen(false); }}
                disabled={item.disabled}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 14px',
                  background: 'none', border: 'none', cursor: item.disabled ? 'not-allowed' : 'pointer',
                  color: item.danger ? 'var(--accent-red)' : 'var(--text-primary)',
                  fontSize: '14px', textAlign: 'left', opacity: item.disabled ? 0.5 : 1,
                  transition: 'background 0.1s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                {item.icon && <item.icon size={15} />}
                {item.label}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
}
