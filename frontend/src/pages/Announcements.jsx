import { useEffect, useState } from 'react'
import api from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function Announcements() {
  const { user } = useAuth()
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const isAdmin = user?.role === 'admin'

  async function load() {
    setLoading(true)
    try {
      const r = await api.get('/announcements/', { params: { page_size: 100 } })
      setRows(r.data.results || r.data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function remove(id) {
    if (!confirm('Delete this announcement?')) return
    try {
      await api.delete(`/announcements/${id}/`)
      toast.success('Announcement deleted')
      load()
    } catch (_) { toast.danger('Delete failed') }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Announcements</h1>
          <div className="subtitle">
            {isAdmin ? 'Broadcast messages to students or staff.' : 'Latest school-wide messages from administration.'}
          </div>
        </div>
        {isAdmin && (
          <div className="row-actions">
            <button onClick={() => setShowCreate(true)}>+ New Announcement</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="card">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 80, marginBottom: 12 }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="icon">📢</div>
            <h3>No announcements yet</h3>
            <p>{isAdmin ? 'Click "+ New Announcement" to send your first one.' : 'Check back later for school-wide messages.'}</p>
          </div>
        </div>
      ) : (
        <div>
          {rows.map((a) => (
            <div key={a.id} className={`announcement ${a.severity}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {a.is_pinned && <span className="pin-mark">📌 Pinned</span>}
                    <h2 style={{ margin: 0 }}>{a.title}</h2>
                    <span className={`badge ${a.severity === 'urgent' ? 'danger' : a.severity === 'warning' ? 'warn' : 'info'}`}>
                      {a.severity}
                    </span>
                  </div>
                  <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{a.body}</p>
                  <div className="meta">
                    From {a.created_by_name || 'admin'} · {new Date(a.created_at).toLocaleString()}
                    {' · Target: '}{a.audience}{a.target_class ? ` (${a.target_class})` : ''}
                  </div>
                </div>
                {isAdmin && (
                  <button className="ghost small danger" onClick={() => remove(a.id)}>Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateAnnouncementModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); toast.success('Announcement published'); load() }} />}
    </div>
  )
}

function CreateAnnouncementModal({ onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState({ title: '', body: '', audience: 'all', target_class: '', severity: 'info', is_pinned: false })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr(null)
    try { await api.post('/announcements/', f); onSaved() }
    catch (ex) {
      const msg = ex.response?.data?.detail || JSON.stringify(ex.response?.data || ex.message)
      setErr(msg); toast.danger('Could not publish')
    } finally { setBusy(false) }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>New Announcement</h2>
        <form onSubmit={submit}>
          <div className="form-row"><label>Title</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></div>
          <div className="form-row"><label>Body</label><textarea rows="5" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} required /></div>
          <div className="grid cols-2">
            <div className="form-row">
              <label>Audience</label>
              <select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>
                <option value="all">All Students</option>
                <option value="staff">Staff Only</option>
                <option value="class">Specific Class</option>
              </select>
            </div>
            <div className="form-row">
              <label>Severity</label>
              <select value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value })}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          {f.audience === 'class' && (
            <div className="form-row">
              <label>Target Class</label>
              <select value={f.target_class} onChange={(e) => setF({ ...f, target_class: e.target.value })} required>
                <option value="">-- select --</option>
                {['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div className="form-row">
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textTransform: 'none', letterSpacing: 0 }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={f.is_pinned} onChange={(e) => setF({ ...f, is_pinned: e.target.checked })} />
              Pin to top
            </label>
          </div>
          {err && <div className="error">{err}</div>}
          <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="ghost" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={busy}>{busy ? 'Publishing...' : 'Publish'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
