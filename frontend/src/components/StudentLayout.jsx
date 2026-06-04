import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import HeaderBar from './HeaderBar.jsx'

const ICONS = {
  home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  pay: <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 10 9 10"/><polyline points="12 7 12 12 16 14"/></>,
  results: <><circle cx="12" cy="8" r="5"/><path d="M8.2 12L7 22l5-3 5 3-1.2-10"/></>,
  timetable: <><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></>,
  book: <><path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path d="M9 8h6M9 12h6"/></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
}
const Icon = ({ d }) => (
  <span className="nav-icon">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  </span>
)

export default function StudentLayout({ children }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const loc = useLocation()

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          SMS418
          <small>Student Portal</small>
        </div>
        <nav className="nav" onClick={() => setOpen(false)}>
          <NavLink to="/portal" end><Icon d={ICONS.home}/> My Account</NavLink>
          <NavLink to="/portal/results"><Icon d={ICONS.results}/> My Results</NavLink>
          <NavLink to="/portal/timetable"><Icon d={ICONS.timetable}/> Timetable</NavLink>
          <NavLink to="/portal/subjects"><Icon d={ICONS.book}/> My Subjects</NavLink>
          <NavLink to="/portal/pay"><Icon d={ICONS.pay}/> Pay Online</NavLink>
          <NavLink to="/portal/payments"><Icon d={ICONS.history}/> Payment History</NavLink>
          <NavLink to="/portal/announcements"><Icon d={ICONS.bell}/> Announcements</NavLink>
          <NavLink to="/portal/settings"><Icon d={ICONS.settings}/> Settings</NavLink>
        </nav>
        <div className="user-bar">
          {user?.full_name || user?.username}<br />
          <small>Matricule: {user?.username}</small>
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
  if (path === '/portal') return 'My Account'
  if (path.startsWith('/portal/results')) return 'My Results'
  if (path.startsWith('/portal/timetable')) return 'Timetable'
  if (path.startsWith('/portal/subjects')) return 'My Subjects'
  if (path.startsWith('/portal/pay')) return 'Pay Online'
  if (path.startsWith('/portal/payments')) return 'Payment History'
  if (path.startsWith('/portal/announcements')) return 'Announcements'
  if (path.startsWith('/portal/settings')) return 'Settings'
  return 'Student Portal'
}
