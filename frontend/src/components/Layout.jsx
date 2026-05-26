import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import HeaderBar from './HeaderBar.jsx'

const ICONS = {
  dashboard: <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>,
  students: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  payments: <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>,
  reports: <><path d="M21 21H3"/><path d="M7 17V9"/><path d="M12 17V5"/><path d="M17 17v-6"/></>,
  audit: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></>,
  announcements: <path d="M3 11h2l9-7v16l-9-7H3v-2zm15-3a5 5 0 0 1 0 8"/>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
}
const Icon = ({ d }) => (
  <span className="nav-icon">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  </span>
)

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [open, setOpen] = useState(false)
  const loc = useLocation()

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          SMS418
          <small>Staff Console</small>
        </div>
        <nav className="nav" onClick={() => setOpen(false)}>
          <NavLink to="/staff" end><Icon d={ICONS.dashboard}/> Dashboard</NavLink>
          <NavLink to="/staff/students"><Icon d={ICONS.students}/> Students</NavLink>
          <NavLink to="/staff/payments"><Icon d={ICONS.payments}/> Payments</NavLink>
          <NavLink to="/staff/reports"><Icon d={ICONS.reports}/> Reports</NavLink>
          <NavLink to="/staff/announcements"><Icon d={ICONS.announcements}/> Announcements</NavLink>
          {isAdmin && <NavLink to="/staff/audit"><Icon d={ICONS.audit}/> Audit Log</NavLink>}
        </nav>
        <div className="user-bar">
          Signed in as <strong>{user?.username}</strong>
          <div style={{ fontSize: 12, marginTop: 2 }}>{user?.role}</div>
          <div style={{ marginTop: 10 }}>
            <button className="ghost small" onClick={logout}>Sign out</button>
          </div>
        </div>
      </aside>

      <div className={`sidebar-backdrop ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />

      <HeaderBar title={titleFor(loc.pathname)} onMenu={() => setOpen(true)} />

      <main className="main">{children}</main>
    </div>
  )
}

function titleFor(path) {
  if (path.startsWith('/staff/students')) return 'Students'
  if (path.startsWith('/staff/payments')) return 'Payments'
  if (path.startsWith('/staff/reports')) return 'Reports'
  if (path.startsWith('/staff/announcements')) return 'Announcements'
  if (path.startsWith('/staff/audit')) return 'Audit Log'
  return 'Staff Console'
}
