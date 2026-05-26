import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api.js'
import DataTable from '../components/DataTable.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))

export default function Students() {
  const { user } = useAuth()
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const isAdmin = user?.role === 'admin'

  async function load() {
    setLoading(true)
    try {
      const r = await api.get('/students/', { params: { page_size: 500 } })
      setRows(r.data.results || r.data)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const columns = [
    { key: 'matricule', label: 'Matricule', sortable: true, render: (s) => <code>{s.matricule}</code> },
    { key: 'full_name', label: 'Name', sortable: true, render: (s) => <Link to={`/staff/students/${s.id}`}>{s.full_name}</Link> },
    { key: 'class_name', label: 'Class', sortable: true },
    { key: 'total_due', label: 'Due', sortable: true, align: 'right', render: (s) => fmt(s.total_due) },
    { key: 'total_paid', label: 'Paid', sortable: true, align: 'right', render: (s) => <span style={{ color: 'var(--success)' }}>{fmt(s.total_paid)}</span> },
    {
      key: 'outstanding', label: 'Outstanding', sortable: true, align: 'right',
      render: (s) => <span className={`badge ${Number(s.outstanding) > 0 ? 'warn' : 'ok'}`}>{fmt(s.outstanding)}</span>,
    },
    { key: 'is_active', label: 'Status', render: (s) => <span className={`badge ${s.is_active ? 'ok' : 'neutral'}`}>{s.is_active ? 'Active' : 'Inactive'}</span> },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Students</h1>
          <div className="subtitle">{rows.length} registered · click a name to view profile and payment history.</div>
        </div>
        {isAdmin && (
          <div className="row-actions">
            <button onClick={() => setShowAdd(true)}>+ Add Student</button>
          </div>
        )}
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        loading={loading}
        searchKeys={['matricule', 'full_name', 'class_name', 'guardian_name']}
        searchPlaceholder="Search by name, matricule, class..."
        emptyIcon="👥"
        emptyTitle="No students yet"
        emptySubtitle={isAdmin ? "Use the Add Student button to enroll the first one." : "Ask an admin to enroll students."}
        initialSort={{ key: 'full_name', dir: 'asc' }}
      />

      {showAdd && <AddStudentModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); toast.success('Student added'); load() }} />}
    </div>
  )
}

function AddStudentModal({ onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState({ matricule: '', full_name: '', class_name: 'Form 1', contact_phone: '', guardian_name: '' })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr(null)
    try { await api.post('/students/', f); onSaved() }
    catch (ex) {
      const msg = ex.response?.data?.detail || JSON.stringify(ex.response?.data || ex.message)
      setErr(msg); toast.danger('Could not save student')
    }
    finally { setBusy(false) }
  }
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Add Student</h2>
        <p style={{ color: 'var(--muted)', marginTop: -8, fontSize: 13 }}>
          A login account is auto-created with username = matricule.
        </p>
        <form onSubmit={submit}>
          <div className="form-row"><label>Matricule</label><input value={f.matricule} onChange={(e) => setF({ ...f, matricule: e.target.value })} required /></div>
          <div className="form-row"><label>Full name</label><input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required /></div>
          <div className="form-row">
            <label>Class</label>
            <select value={f.class_name} onChange={(e) => setF({ ...f, class_name: e.target.value })}>
              {['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-row"><label>Contact phone</label><input value={f.contact_phone} onChange={(e) => setF({ ...f, contact_phone: e.target.value })} /></div>
          <div className="form-row"><label>Guardian name</label><input value={f.guardian_name} onChange={(e) => setF({ ...f, guardian_name: e.target.value })} /></div>
          {err && <div className="error">{err}</div>}
          <div className="row-actions" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="ghost" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save Student'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
