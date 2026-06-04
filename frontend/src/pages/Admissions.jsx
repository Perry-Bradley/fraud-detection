import { useEffect, useState } from 'react'
import api from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

const STATUS_BADGE = {
  submitted: 'neutral', under_review: 'warn', admitted: 'ok',
  waitlisted: 'warn', rejected: 'danger', enrolled: 'ok',
}

export default function Admissions() {
  const { user } = useAuth()
  const toast = useToast()
  const isAdmin = user?.role === 'admin'
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  async function load() {
    setLoading(true)
    try {
      const r = await api.get('/applications/', { params: { page_size: 300, ...(filter ? { status: filter } : {}) } })
      setRows(r.data.results || r.data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [filter])

  async function decide(app, status) {
    try {
      await api.post(`/applications/${app.id}/decide/`, { status })
      toast.success(`Marked ${status}`)
      load()
    } catch { toast.danger('Action failed') }
  }
  async function enroll(app) {
    try {
      const r = await api.post(`/applications/${app.id}/enroll/`, {})
      toast.success(`Enrolled as ${r.data.matricule}`)
      load()
    } catch (ex) { toast.danger(ex.response?.data?.detail || 'Enroll failed') }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Admissions</h1>
          <div className="subtitle">{rows.length} application(s). Review, admit and enroll new students.</div>
        </div>
        <div className="row-actions">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under review</option>
            <option value="admitted">Admitted</option>
            <option value="waitlisted">Waitlisted</option>
            <option value="rejected">Rejected</option>
            <option value="enrolled">Enrolled</option>
          </select>
        </div>
      </div>

      {loading ? <div className="card">Loading…</div> : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Ref</th><th style={th}>Applicant</th><th style={th}>Class</th>
              <th style={th}>Guardian</th><th style={th}>Status</th><th style={th}>Actions</th>
            </tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td style={td}><code>{a.reference}</code></td>
                  <td style={td}>{a.applicant_name}</td>
                  <td style={td}>{a.desired_class}</td>
                  <td style={td}>{a.guardian_name}<div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.guardian_phone}</div></td>
                  <td style={td}><span className={`badge ${STATUS_BADGE[a.status] || 'neutral'}`}>{a.status_display}</span></td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {a.status !== 'enrolled' && <>
                        <button className="ghost small" onClick={() => decide(a, 'admitted')}>Admit</button>
                        <button className="ghost small" onClick={() => decide(a, 'rejected')}>Reject</button>
                        {isAdmin && a.status === 'admitted' && <button className="small" onClick={() => enroll(a)}>Enroll →</button>}
                      </>}
                      {a.status === 'enrolled' && <span style={{ fontSize: 12, color: 'var(--success)' }}>✓ enrolled</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const th = { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid var(--border)', fontSize: 12 }
const td = { padding: '6px 10px', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }
