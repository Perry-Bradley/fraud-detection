import { useState } from 'react'
import api from '../../api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

export default function PortalSettings() {
  const { user } = useAuth()
  const toast = useToast()
  const [oldPw, setOld] = useState('')
  const [newPw, setNew] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  const initials = (user?.full_name || user?.username || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  const usingDefaultPw = oldPw === user?.username

  async function submit(e) {
    e.preventDefault()
    setErr(null)
    if (newPw.length < 6) return setErr('New password must be at least 6 characters.')
    if (newPw !== confirm) return setErr('Confirmation does not match.')
    if (newPw === oldPw) return setErr('New password must be different from current one.')
    setBusy(true)
    try {
      await api.post('/portal/change-password/', { old_password: oldPw, new_password: newPw })
      toast.success('Password updated successfully')
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
      <p style={{ color: 'var(--muted)', marginTop: -4 }}>
        Manage your profile and account security.
      </p>

      {/* Profile card */}
      <div className="card" style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'var(--primary)', color: '#fff',
          display: 'grid', placeItems: 'center',
          fontWeight: 800, fontSize: 24,
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(21, 128, 61, 0.25)',
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.full_name || user?.username}</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>
            Student · <code>{user?.username}</code>
          </div>
        </div>
      </div>

      {/* Profile details */}
      <div className="card">
        <h2>Profile Information</h2>
        <div className="grid cols-2" style={{ gap: 14 }}>
          <Field label="Full Name" value={user?.full_name || '—'} />
          <Field label="Matricule" value={user?.username} mono />
          <Field label="Email" value={user?.email || 'Not set'} />
          <Field label="Role" value="Student" />
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 14, marginBottom: 0 }}>
          Profile information can only be changed by school administration.
        </p>
      </div>

      {/* Change password */}
      <div className="card">
        <h2>🔐 Change Password</h2>
        {usingDefaultPw && (
          <div style={{
            background: 'var(--warn-tint)',
            border: '1px solid #f59e0b',
            borderLeft: '4px solid var(--warn)',
            padding: '10px 12px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            color: '#78350f',
          }}>
            ⚠️ You're using the default password (your matricule). Please change it now.
          </div>
        )}
        <p style={{ color: 'var(--muted)', marginTop: -4, marginBottom: 14, fontSize: 13 }}>
          On first sign-in your password is your matricule. Choose something only you know.
        </p>
        <form onSubmit={submit}>
          <div className="form-row">
            <label>Current password</label>
            <input type="password" value={oldPw} onChange={(e) => setOld(e.target.value)} required autoComplete="current-password" />
          </div>
          <div className="form-row">
            <label>New password</label>
            <input type="password" value={newPw} onChange={(e) => setNew(e.target.value)} required minLength={6} autoComplete="new-password" />
            <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4 }}>At least 6 characters.</p>
          </div>
          <div className="form-row">
            <label>Confirm new password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
          </div>
          {err && <div className="error">{err}</div>}
          <button type="submit" disabled={busy} style={{ marginTop: 8 }}>
            {busy ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Help card */}
      <div className="card" style={{ background: 'var(--surface-2)' }}>
        <h2 style={{ marginTop: 0 }}>Need Help?</h2>
        <p style={{ color: 'var(--muted)', margin: 0, fontSize: 13 }}>
          For account issues, fee questions or to update your contact details, please visit the bursary office or contact administration directly.
        </p>
      </div>
    </div>
  )
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontFamily: mono ? "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace" : 'inherit' }}>
        {value}
      </div>
    </div>
  )
}
