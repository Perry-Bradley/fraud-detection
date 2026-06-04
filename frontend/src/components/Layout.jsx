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
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
  award: <><circle cx="12" cy="8" r="6"/><path d="M15.5 13.5L17 22l-5-3-5 3 1.5-8.5"/></>,
  check: <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
  pencil: <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></>,
  inbox: <><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></>,
  staff: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></>,
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
          <NavLink to="/staff/anomalies"><Icon d={ICONS.shield}/> Fraud Detection</NavLink>
          <NavLink to="/staff/gradebook"><Icon d={ICONS.book}/> Gradebook</NavLink>
          <NavLink to="/staff/report-cards"><Icon d={ICONS.award}/> Report Cards</NavLink>
          <NavLink to="/staff/attendance"><Icon d={ICONS.check}/> Attendance</NavLink>
          <NavLink to="/staff/exams"><Icon d={ICONS.pencil}/> Exams</NavLink>
          <NavLink to="/staff/timetable"><Icon d={ICONS.calendar}/> Timetable</NavLink>
          <NavLink to="/staff/admissions"><Icon d={ICONS.inbox}/> Admissions</NavLink>
          <NavLink to="/staff/staff"><Icon d={ICONS.staff}/> Staff</NavLink>
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
  if (path.startsWith('/staff/anomalies')) return 'Fraud Detection'
  if (path.startsWith('/staff/gradebook')) return 'Gradebook'
  if (path.startsWith('/staff/report-cards')) return 'Report Cards'
  if (path.startsWith('/staff/attendance')) return 'Attendance'
  if (path.startsWith('/staff/exams')) return 'Exams'
  if (path.startsWith('/staff/timetable')) return 'Timetable'
  if (path.startsWith('/staff/admissions')) return 'Admissions'
  if (path.startsWith('/staff/staff')) return 'Staff'
  if (path.startsWith('/staff/reports')) return 'Reports'
  if (path.startsWith('/staff/announcements')) return 'Announcements'
  if (path.startsWith('/staff/audit')) return 'Audit Log'
  return 'Staff Console'
}
