import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin'
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          SMS418
          <small>School Fees System</small>
        </div>
        <nav className="nav">
          <NavLink to="/staff" end>Dashboard</NavLink>
          <NavLink to="/staff/students">Students</NavLink>
          <NavLink to="/staff/payments">Payments</NavLink>
          <NavLink to="/staff/reports">Reports</NavLink>
          {isAdmin && <NavLink to="/staff/audit">Audit Log</NavLink>}
        </nav>
        <div className="user-bar">
          Signed in as <strong>{user?.username}</strong> ({user?.role})
          <div style={{ marginTop: 8 }}>
            <button className="ghost" onClick={logout}>Sign out</button>
          </div>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
