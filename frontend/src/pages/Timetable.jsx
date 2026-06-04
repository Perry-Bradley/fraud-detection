import { useEffect, useState } from 'react'
import api from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function Timetable() {
  const { user } = useAuth()
  const toast = useToast()
  const isAdmin = user?.role === 'admin'

  const [classes, setClasses] = useState([])
  const [klass, setKlass] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState(null)

  useEffect(() => {
    api.get('/classes/', { params: { page_size: 200 } })
      .then((r) => {
        const list = r.data.results || r.data
        setClasses(list)
        if (list.length) setKlass(list[0].name)
      })
      .catch(() => {})
  }, [])

  async function loadGrid(name) {
    if (!name) return
    setLoading(true)
    try {
      const r = await api.get('/timetable/class/', { params: { class_name: name } })
      setData(r.data)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadGrid(klass) }, [klass])

  async function generate() {
    setGenerating(true); setReport(null)
    try {
      const r = await api.post('/timetable/generate/', {})
      setReport(r.data)
      if (r.data.fully_scheduled) toast.success(`Timetable generated — ${r.data.placed} lessons placed, 0 conflicts`)
      else toast.warning(`Generated with ${r.data.unplaced.length} unplaced lesson(s)`)
      loadGrid(klass)
    } catch (ex) {
      toast.danger(ex.response?.data?.detail || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const periods = data?.periods || []
  const days = data?.days || []

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Timetable</h1>
          <div className="subtitle">Conflict-free class & teacher scheduling, built automatically.</div>
        </div>
        {isAdmin && (
          <div className="row-actions">
            <button onClick={generate} disabled={generating}>
              {generating ? '⏳ Generating…' : '✨ Auto-generate timetable'}
            </button>
          </div>
        )}
      </div>

      {report && (
        <div className="card" style={{
          background: report.fully_scheduled ? 'linear-gradient(135deg,#dcfce7,#f0fdf4)' : 'linear-gradient(135deg,#fef3c7,#fffbeb)',
          border: 'none',
        }}>
          <strong>{report.fully_scheduled ? '✅ Fully scheduled' : '⚠️ Mostly scheduled'}</strong>
          {' '}— {report.placed} lessons placed across {report.classes} classes
          ({report.slots_per_week} slots/week). {report.unplaced.length} unplaced.
          {report.unplaced.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              Unplaced (teacher over-subscribed or not enough slots): {report.unplaced.join(', ')}
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ maxWidth: 360 }}>
        <label>Class</label>
        <select value={klass} onChange={(e) => setKlass(e.target.value)}>
          {classes.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      {loading ? <div className="card">Loading…</div> : (
        <div className="card" style={{ overflowX: 'auto' }}>
          {periods.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
              No periods configured yet. Add periods (and class-subjects with teachers),
              then click <strong>Auto-generate timetable</strong>.
            </div>
          ) : (
            <table className="grid-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Day</th>
                  {periods.map((p) => (
                    <th key={p.id} style={th}>
                      P{p.ordinal}
                      <div style={{ fontWeight: 400, fontSize: 10, color: 'var(--muted)' }}>
                        {p.start_time?.slice(0, 5)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.slice(0, 5).map((d) => (
                  <tr key={d.day}>
                    <td style={{ ...td, fontWeight: 600 }}>{d.label}</td>
                    {periods.map((p) => {
                      const cell = data.grid?.[d.day]?.slots?.[p.ordinal]
                      return (
                        <td key={p.id} style={td}>
                          {cell ? (
                            <div style={{
                              background: '#eff6ff', borderRadius: 6, padding: '4px 6px',
                              fontSize: 12, lineHeight: 1.3,
                            }}>
                              <strong>{cell.subject_code}</strong>
                              <div style={{ color: 'var(--muted)', fontSize: 10 }}>
                                {cell.teacher_name || '—'}{cell.room_name ? ` · ${cell.room_name}` : ''}
                              </div>
                            </div>
                          ) : <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

const th = { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid var(--border)', fontSize: 12 }
const td = { padding: '6px 8px', borderBottom: '1px solid var(--border)', verticalAlign: 'top', minWidth: 90 }
