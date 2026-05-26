import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function StudentLayout({ children }) {
  const { user, logout } = useAuth()
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          SMS418
          <small>Student Portal</small>
        </div>
        <nav className="nav">
          <NavLink to="/portal" end>My Account</NavLink>
          <NavLink to="/portal/pay">Pay Online</NavLink>
          <NavLink to="/portal/payments">My Payments</NavLink>
          <NavLink to="/portal/settings">Settings</NavLink>
        </nav>
        <div className="user-bar">
          {user?.full_name || user?.username}<br />
          <small>Matricule: {user?.username}</small>
          <div style={{ marginTop: 8 }}>
            <button className="ghost" onClick={logout}>Sign out</button>
          </div>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
