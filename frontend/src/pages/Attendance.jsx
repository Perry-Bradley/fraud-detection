import { useEffect, useState } from 'react'
import api from '../api.js'
import { useToast } from '../context/ToastContext.jsx'

const STATUSES = [
  { v: 'present', label: 'Present', color: '#16a34a' },
  { v: 'absent', label: 'Absent', color: '#dc2626' },
  { v: 'late', label: 'Late', color: '#d97706' },
  { v: 'excused', label: 'Excused', color: '#6b7280' },
]

const today = () => new Date().toISOString().slice(0, 10)

export default function Attendance() {
  const toast = useToast()
  const [classes, setClasses] = useState([])
  const [className, setClassName] = useState('')
  const [date, setDate] = useState(today())
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get('/classes/', { params: { page_size: 200 } })
      .then((r) => {
        const list = r.data.results || r.data
        setClasses(list)
        if (list.length) setClassName(list[0].name)
      }).catch(() => {})
  }, [])

  async function load() {
    if (!className || !date) return
    setLoading(true)
    try {
      const r = await api.get('/attendance/roster/', { params: { class_name: className, date } })
      setRoster(r.data.roster)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [className, date])

  function setStatus(i, v) {
    setRoster((rs) => rs.map((r, idx) => idx === i ? { ...r, status: v } : r))
  }
  function markAll(v) {
    setRoster((rs) => rs.map((r) => ({ ...r, status: v })))
  }

  async function save() {
    setBusy(true)
    try {
      const r = await api.post('/attendance/mark/', {
        class_name: className, date,
        records: roster.map((r) => ({ student: r.student, status: r.status, note: r.note })),
      })
      toast.success(r.data.detail)
    } catch (ex) {
      toast.danger(ex.response?.data?.detail || 'Could not save')
    } finally { setBusy(false) }
  }

  const present = roster.filter((r) => r.status === 'present').length
  const absent = roster.filter((r) => r.status === 'absent').length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Attendance</h1>
          <div className="subtitle">Mark the register — absences automatically alert parents.</div>
        </div>
      </div>

      <div className="card">
        <div className="grid cols-3">
          <div><label>Class</label>
            <select value={className} onChange={(e) => setClassName(e.target.value)}>
              {classes.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div><label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <button className="ghost small" onClick={() => markAll('present')}>All present</button>
          </div>
        </div>
      </div>

      {roster.length > 0 && (
        <div className="grid cols-3">
          <div className="card stat"><div className="label">Students</div><div className="value">{roster.length}</div></div>
          <div className="card stat"><div className="label">Present</div><div className="value" style={{ color: 'var(--success)' }}>{present}</div></div>
          <div className="card stat"><div className="label">Absent</div><div className="value" style={{ color: 'var(--danger)' }}>{absent}</div></div>
        </div>
      )}

      {loading ? <div className="card">Loading…</div> : roster.length > 0 && (
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Matricule</th><th style={th}>Student</th><th style={th}>Status</th></tr></thead>
            <tbody>
              {roster.map((r, i) => (
                <tr key={r.student}>
                  <td style={td}><code>{r.matricule}</code></td>
                  <td style={td}>{r.student_name}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {STATUSES.map((s) => (
                        <button key={s.v} onClick={() => setStatus(i, s.v)}
                          className={r.status === s.v ? '' : 'ghost'}
                          style={r.status === s.v ? { background: s.color, borderColor: s.color } : {}}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row-actions" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
            <button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save register & alert parents'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

const th = { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid var(--border)', fontSize: 12 }
const td = { padding: '6px 10px', borderBottom: '1px solid var(--border)' }
