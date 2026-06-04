import { useEffect, useState } from 'react'
import api from '../api.js'
import { useToast } from '../context/ToastContext.jsx'

export default function Exams() {
  const toast = useToast()
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState('')
  const [className, setClassName] = useState('')
  const [classes, setClasses] = useState([])
  const [schedules, setSchedules] = useState([])
  const [active, setActive] = useState(null)
  const [roster, setRoster] = useState([])
  const [rankings, setRankings] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/exam-sessions/', { params: { page_size: 100 } }),
      api.get('/classes/', { params: { page_size: 200 } }),
    ]).then(([s, c]) => {
      setSessions(s.data.results || s.data)
      const cl = c.data.results || c.data
      setClasses(cl)
      if (cl.length) setClassName(cl[0].name)
    }).catch(() => {})
  }, [])

  async function loadSchedules() {
    if (!sessionId || !className) { setSchedules([]); return }
    const r = await api.get('/exam-schedules/', { params: { session: sessionId, class_name: className, page_size: 200 } })
    setSchedules(r.data.results || r.data)
    setActive(null); setRoster([]); setRankings(null)
  }
  useEffect(() => { loadSchedules() }, [sessionId, className])

  async function openSchedule(s) {
    const r = await api.get(`/exam-schedules/${s.id}/roster/`)
    setActive(s); setRoster(r.data.roster); setRankings(null)
  }

  async function saveResults() {
    setBusy(true)
    try {
      await api.post(`/exam-schedules/${active.id}/results/`, {
        results: roster.map((r) => ({ student: r.student, score: r.score, is_absent: r.is_absent })),
      })
      toast.success('Results saved')
    } catch (ex) { toast.danger('Save failed') }
    finally { setBusy(false) }
  }

  async function showRankings() {
    const r = await api.get(`/exam-sessions/${sessionId}/rankings/`, { params: { class_name: className } })
    setRankings(r.data); setActive(null)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Exams</h1>
          <div className="subtitle">Schedule sittings, enter results, and publish ranked pass/fail sheets.</div>
        </div>
      </div>

      <div className="card">
        <div className="grid cols-3">
          <div><label>Exam session</label>
            <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
              <option value="">—</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><label>Class</label>
            <select value={className} onChange={(e) => setClassName(e.target.value)}>
              {classes.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            {sessionId && <button className="ghost" onClick={showRankings}>📊 View rankings</button>}
          </div>
        </div>
      </div>

      {schedules.length > 0 && !rankings && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Subject sittings</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {schedules.map((s) => (
              <button key={s.id} className={active?.id === s.id ? '' : 'ghost'} onClick={() => openSchedule(s)}>
                {s.subject_code} {s.date ? `· ${s.date}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {active && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{active.subject_name} — enter results</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Matricule</th><th style={th}>Student</th><th style={th}>Score</th></tr></thead>
            <tbody>
              {roster.map((r, i) => (
                <tr key={r.student}>
                  <td style={td}><code>{r.matricule}</code></td>
                  <td style={td}>{r.student_name}</td>
                  <td style={td}>
                    <input type="number" min="0" step="0.25" value={r.score ?? ''} style={{ width: 90 }}
                      onChange={(e) => setRoster((rs) => rs.map((x, idx) => idx === i ? { ...x, score: e.target.value } : x))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row-actions" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
            <button onClick={saveResults} disabled={busy}>{busy ? 'Saving…' : 'Save results'}</button>
          </div>
        </div>
      )}

      {rankings && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <h3 style={{ marginTop: 0 }}>{rankings.session} — {rankings.class_name} (pass mark {rankings.pass_mark})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Rank</th><th style={th}>Matricule</th><th style={th}>Student</th>
              <th style={{ ...th, textAlign: 'right' }}>Average</th><th style={th}>Result</th>
            </tr></thead>
            <tbody>
              {rankings.results.map((r) => (
                <tr key={r.student}>
                  <td style={td}><strong>{r.rank}</strong></td>
                  <td style={td}><code>{r.matricule}</code></td>
                  <td style={td}>{r.student_name}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{r.average}</td>
                  <td style={td}><span className={`badge ${r.passed ? 'ok' : 'warn'}`}>{r.passed ? 'PASS' : 'FAIL'}</span></td>
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
const td = { padding: '6px 10px', borderBottom: '1px solid var(--border)' }
