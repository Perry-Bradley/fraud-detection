import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const CLASSES = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Lower Sixth', 'Upper Sixth']

export default function Signup() {
  const { signup } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({
    full_name: '', matricule: '', class_name: 'Form 1',
    email: '', phone: '', password: '', confirm: '',
  })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setErr(null)
    if (f.password !== f.confirm) { setErr('Passwords do not match'); return }
    if (f.password.length < 6) { setErr('Password must be at least 6 characters'); return }
    setBusy(true)
    try {
      const me = await signup({
        full_name: f.full_name, matricule: f.matricule, class_name: f.class_name,
        email: f.email, phone: f.phone, password: f.password,
      })
      nav(me?.role === 'student' ? '/portal' : '/')
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Could not create your account')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="card login-card" style={{ maxWidth: 460 }}>
        <h2 style={{ marginTop: 0 }}>Create your student account</h2>
        <p style={{ color: 'var(--muted)', marginTop: -8 }}>Register to access fees, results and your timetable.</p>
        <form onSubmit={submit}>
          <div className="form-row">
            <label>Full name</label>
            <input value={f.full_name} onChange={set('full_name')} required autoFocus />
          </div>
          <div className="grid cols-2" style={{ gap: 12 }}>
            <div className="form-row">
              <label>Matricule</label>
              <input value={f.matricule} onChange={set('matricule')} placeholder="e.g. CT24A101" required />
            </div>
            <div className="form-row">
              <label>Class</label>
              <select value={f.class_name} onChange={set('class_name')}>
                {CLASSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <label>Email <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
            <input type="email" value={f.email} onChange={set('email')} />
          </div>
          <div className="form-row">
            <label>Phone <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
            <input value={f.phone} onChange={set('phone')} placeholder="6XXXXXXXX" />
          </div>
          <div className="grid cols-2" style={{ gap: 12 }}>
            <div className="form-row">
              <label>Password</label>
              <input type="password" value={f.password} onChange={set('password')} required />
            </div>
            <div className="form-row">
              <label>Confirm</label>
              <input type="password" value={f.confirm} onChange={set('confirm')} required />
            </div>
          </div>
          {err && <div className="error">{err}</div>}
          <button type="submit" disabled={busy} style={{ width: '100%', marginTop: 8 }}>
            {busy ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 16, textAlign: 'center' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
