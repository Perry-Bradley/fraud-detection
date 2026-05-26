import NotificationBell from './NotificationBell.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function HeaderBar({ title, onMenu }) {
  const { user } = useAuth()
  return (
    <header className="header-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onMenu && (
          <button className="hamburger" onClick={onMenu} aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        )}
        <div className="header-title">{title}</div>
      </div>
      <div className="header-actions">
        <NotificationBell />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, borderRadius: 999,
            background: 'var(--primary-tint)', color: 'var(--primary-hover)',
            fontWeight: 700, fontSize: 12,
          }}>
            {(user?.full_name || user?.username || '?').slice(0, 2).toUpperCase()}
          </span>
          <span className="hide-on-mobile" style={{ fontWeight: 500 }}>{user?.full_name || user?.username}</span>
        </div>
      </div>
    </header>
  )
}
