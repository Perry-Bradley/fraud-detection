import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api.js'

function timeAgo(iso) {
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString()
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const nav = useNavigate()
  const pollRef = useRef(null)

  async function refresh() {
    try {
      const [list, count] = await Promise.all([
        api.get('/notifications/'),
        api.get('/notifications/unread_count/'),
      ])
      setItems(list.data)
      setUnread(count.data.unread)
    } catch (_) { /* ignore */ }
  }

  useEffect(() => {
    refresh()
    pollRef.current = setInterval(refresh, 30000) // every 30s
    return () => clearInterval(pollRef.current)
  }, [])

  async function onClickItem(n) {
    try { await api.post(`/notifications/${n.id}/mark_read/`) } catch (_) {}
    refresh()
    setOpen(false)
    if (n.link) nav(n.link)
  }

  async function onMarkAll() {
    try { await api.post('/notifications/mark_all_read/') } catch (_) {}
    refresh()
  }

  return (
    <>
      <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Notifications">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
        {unread > 0 && <span className="notif-dot">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <>
          <div className="sidebar-backdrop open" onClick={() => setOpen(false)} />
          <aside className="drawer">
            <div className="drawer-header">
              <strong>Notifications</strong>
              <button className="icon-btn" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="drawer-body">
              {items.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">🔔</div>
                  <h3>All caught up</h3>
                  <p>You have no notifications yet.</p>
                </div>
              ) : (
                items.map((n) => (
                  <div
                    key={n.id}
                    className={`notif-item ${n.is_read ? '' : 'unread'}`}
                    onClick={() => onClickItem(n)}
                  >
                    <div className="title">
                      <span className={`badge ${n.kind === 'success' ? 'ok' : n.kind === 'danger' ? 'danger' : n.kind === 'warning' ? 'warn' : 'info'}`}>
                        {n.kind}
                      </span>{' '}
                      {n.title}
                    </div>
                    <div className="body">{n.message}</div>
                    <div className="time">{timeAgo(n.created_at)}</div>
                  </div>
                ))
              )}
            </div>
            <div className="drawer-footer">
              <button className="ghost small" onClick={onMarkAll} disabled={!unread}>Mark all read</button>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>Auto-refresh 30s</span>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
