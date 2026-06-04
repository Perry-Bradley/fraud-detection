import { useEffect, useState } from 'react'
import api from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function Staff() {
  const { user } = useAuth()
  const toast = useToast()
  const isAdmin = user?.role === 'admin'
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await api.get('/staff/', { params: { page_size: 300 } })
      setRows(r.data.results || r.data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Staff</h1>
          <div className="subtitle">{rows.length} staff member(s) — records, attendance and leave.</div>
        </div>
        {isAdmin && <div className="row-actions"><button onClick={() => setShowAdd(true)}>+ Add staff</button></div>}
      </div>

      {loading ? <div className="card">Loading…</div> : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Staff ID</th><th style={th}>Name</th><th style={th}>Designation</th>
              <th style={th}>Department</th><th style={th}>Type</th><th style={th}>Status</th>
            </tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td style={td}><code>{s.staff_id}</code></td>
                  <td style={td}>{s.full_name}</td>
                  <td style={td}>{s.designation || '—'}</td>
                  <td style={td}>{s.department || '—'}</td>
                  <td style={td}>{s.employment_type}</td>
                  <td style={td}><span className={`badge ${s.is_active ? 'ok' : 'neutral'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddStaff onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); toast.success('Staff added'); load() }} />}
    </div>
  )
}

function AddStaff({ onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState({ staff_id: '', full_name: '', designation: '', department: '', phone: '', employment_type: 'full_time' })
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setBusy(true)
    try { await api.post('/staff/', f); onSaved() }
    catch (ex) { toast.danger(ex.response?.data?.detail || 'Could not save') }
    finally { setBusy(false) }
  }
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Add Staff</h2>
        <form onSubmit={submit}>
          <div className="form-row"><label>Staff ID</label><input value={f.staff_id} onChange={(e) => setF({ ...f, staff_id: e.target.value })} required /></div>
          <div className="form-row"><label>Full name</label><input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required /></div>
          <div className="form-row"><label>Designation</label><input value={f.designation} onChange={(e) => setF({ ...f, designation: e.target.value })} placeholder="Mathematics Teacher" /></div>
          <div className="form-row"><label>Department</label><input value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} /></div>
          <div className="form-row"><label>Phone</label><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div className="form-row"><label>Employment</label>
            <select value={f.employment_type} onChange={(e) => setF({ ...f, employment_type: e.target.value })}>
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="contract">Contract</option>
            </select>
          </div>
          <div className="row-actions" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="ghost" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const th = { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid var(--border)', fontSize: 12 }
const td = { padding: '6px 10px', borderBottom: '1px solid var(--border)' }
