import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [username, setU] = useState('admin')
  const [password, setP] = useState('admin')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      const me = await login(username, password)
      nav(me?.role === 'student' ? '/portal' : '/')
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="card login-card">
        <h2 style={{ marginTop: 0 }}>School Fees Management</h2>
        <p style={{ color: 'var(--muted)', marginTop: -8 }}>Sign in to continue</p>
        <form onSubmit={submit}>
          <div className="form-row">
            <label>Username</label>
            <input value={username} onChange={(e) => setU(e.target.value)} autoFocus />
          </div>
          <div className="form-row">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setP(e.target.value)} />
          </div>
          {err && <div className="error">{err}</div>}
          <button type="submit" disabled={busy} style={{ width: '100%', marginTop: 8 }}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 16, textAlign: 'center' }}>
          New student? <Link to="/signup">Create an account</Link>
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
          Staff: <code>admin / admin</code><br />
          Student: matricule (e.g. <code>CT24A101</code>) — password = matricule
        </p>
      </div>
    </div>
  )
}
