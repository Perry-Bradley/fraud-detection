import { useState } from 'react'
import api from '../../api.js'
import { useAuth } from '../../context/AuthContext.jsx'

export default function PortalSettings() {
  const { user } = useAuth()
  const [oldPw, setOld] = useState('')
  const [newPw, setNew] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setMsg(null); setErr(null)
    if (newPw.length < 6) return setErr('New password must be at least 6 characters.')
    if (newPw !== confirm) return setErr('Confirmation does not match.')
    setBusy(true)
    try {
      await api.post('/portal/change-password/', { old_password: oldPw, new_password: newPw })
      setMsg('Password updated.')
      setOld(''); setNew(''); setConfirm('')
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Could not update password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Settings</h1>

      <div className="card">
        <h2>Profile</h2>
        <p><strong>Name:</strong> {user?.full_name || user?.username}</p>
        <p><strong>Matricule:</strong> {user?.username}</p>
        <p><strong>Email:</strong> {user?.email || '—'}</p>
      </div>

      <div className="card">
        <h2>Change Password</h2>
        <p style={{ color: 'var(--muted)', marginTop: -4 }}>
          On first sign-in your password is the same as your matricule. Please change it.
        </p>
        <form onSubmit={submit} style={{ maxWidth: 420 }}>
          <div className="form-row">
            <label>Current password</label>
            <input type="password" value={oldPw} onChange={(e) => setOld(e.target.value)} required />
          </div>
          <div className="form-row">
            <label>New password</label>
            <input type="password" value={newPw} onChange={(e) => setNew(e.target.value)} required />
          </div>
          <div className="form-row">
            <label>Confirm new password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          {err && <div className="error">{err}</div>}
          {msg && <div style={{ color: 'var(--success)' }}>{msg}</div>}
          <button type="submit" disabled={busy} style={{ marginTop: 8 }}>
            {busy ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
