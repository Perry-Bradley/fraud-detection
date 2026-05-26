import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'

const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))

export default function Students() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const isAdmin = user?.role === 'admin'

  async function load() {
    const r = await api.get('/students/', { params: { search: q || undefined } })
    setRows(r.data.results || r.data)
  }
  useEffect(() => { load() }, [])
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [q])

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Students</h1>
      <div className="toolbar">
        <input placeholder="Search by name, matricule..." value={q} onChange={(e) => setQ(e.target.value)} />
        {isAdmin && <button onClick={() => setShowAdd(true)}>+ Add Student</button>}
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Matricule</th><th>Name</th><th>Class</th>
              <th>Total Due</th><th>Total Paid</th><th>Outstanding</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>{s.matricule}</td>
                <td>{s.full_name}</td>
                <td>{s.class_name}</td>
                <td>{fmt(s.total_due)}</td>
                <td>{fmt(s.total_paid)}</td>
                <td>
                  <span className={`badge ${Number(s.outstanding) > 0 ? 'warn' : 'ok'}`}>
                    {fmt(s.outstanding)}
                  </span>
                </td>
                <td><Link to={`/staff/students/${s.id}`}>View</Link></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)' }}>No students.</td></tr>}
          </tbody>
        </table>
      </div>
      {showAdd && <AddStudentModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
    </div>
  )
}

function AddStudentModal({ onClose, onSaved }) {
  const [f, setF] = useState({ matricule: '', full_name: '', class_name: 'Form 1', contact_phone: '', guardian_name: '' })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr(null)
    try { await api.post('/students/', f); onSaved() }
    catch (ex) { setErr(JSON.stringify(ex.response?.data || ex.message)) }
    finally { setBusy(false) }
  }
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Add Student</h2>
        <form onSubmit={submit}>
          {['matricule', 'full_name', 'class_name', 'contact_phone', 'guardian_name'].map((k) => (
            <div className="form-row" key={k}>
              <label>{k.replace('_', ' ')}</label>
              <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            </div>
          ))}
          {err && <div className="error">{err}</div>}
          <div className="row-actions" style={{ marginTop: 12 }}>
            <button type="submit" disabled={busy}>Save</button>
            <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
