import { useEffect, useState } from 'react'
import api from '../api.js'
import { useToast } from '../context/ToastContext.jsx'

export default function Gradebook() {
  const toast = useToast()
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [terms, setTerms] = useState([])
  const [f, setF] = useState({ school_class: '', subject: '', term: '' })
  const [assessments, setAssessments] = useState([])
  const [active, setActive] = useState(null)   // assessment being graded
  const [roster, setRoster] = useState([])
  const [busy, setBusy] = useState(false)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/classes/', { params: { page_size: 200 } }),
      api.get('/subjects/', { params: { page_size: 200 } }),
      api.get('/terms/', { params: { page_size: 200 } }),
    ]).then(([c, s, t]) => {
      setClasses(c.data.results || c.data)
      setSubjects(s.data.results || s.data)
      setTerms(t.data.results || t.data)
    }).catch(() => {})
  }, [])

  async function loadAssessments() {
    if (!f.school_class || !f.subject || !f.term) return
    const r = await api.get('/assessments/', { params: { ...f, page_size: 200 } })
    setAssessments(r.data.results || r.data)
    setActive(null); setRoster([])
  }
  useEffect(() => { loadAssessments() }, [f.school_class, f.subject, f.term])

  async function openAssessment(a) {
    const r = await api.get(`/assessments/${a.id}/roster/`)
    setActive(a)
    setRoster(r.data.roster)
  }

  function setScore(i, val) {
    setRoster((rs) => rs.map((r, idx) => idx === i ? { ...r, score: val } : r))
  }

  async function saveGrades() {
    setBusy(true)
    try {
      await api.post(`/assessments/${active.id}/grades/`, {
        grades: roster.map((r) => ({ student: r.student, score: r.score, is_absent: r.is_absent, remark: r.remark })),
      })
      toast.success('Grades saved')
      loadAssessments()
    } catch (ex) {
      toast.danger(ex.response?.data?.detail || 'Save failed')
    } finally { setBusy(false) }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Gradebook</h1>
          <div className="subtitle">Enter continuous-assessment and exam scores per class & subject.</div>
        </div>
      </div>

      <div className="card">
        <div className="grid cols-3">
          <div><label>Class</label>
            <select value={f.school_class} onChange={(e) => setF({ ...f, school_class: e.target.value })}>
              <option value="">—</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label>Subject</label>
            <select value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}>
              <option value="">—</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
            </select>
          </div>
          <div><label>Term</label>
            <select value={f.term} onChange={(e) => setF({ ...f, term: e.target.value })}>
              <option value="">—</option>
              {terms.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>
        {f.school_class && f.subject && f.term && (
          <div className="row-actions" style={{ marginTop: 12 }}>
            <button onClick={() => setShowNew(true)}>+ New assessment</button>
          </div>
        )}
      </div>

      {assessments.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Assessments</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {assessments.map((a) => (
              <button key={a.id} className={active?.id === a.id ? '' : 'ghost'} onClick={() => openAssessment(a)}>
                {a.name} <span style={{ opacity: 0.6 }}>/{a.max_score} · {a.graded_count} graded</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {active && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{active.name} — enter scores (out of {active.max_score})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Matricule</th><th style={th}>Student</th>
              <th style={th}>Score</th><th style={th}>Absent</th>
            </tr></thead>
            <tbody>
              {roster.map((r, i) => (
                <tr key={r.student}>
                  <td style={td}><code>{r.matricule}</code></td>
                  <td style={td}>{r.student_name}</td>
                  <td style={td}>
                    <input type="number" min="0" max={active.max_score} step="0.25"
                      value={r.score ?? ''} onChange={(e) => setScore(i, e.target.value)}
                      style={{ width: 90 }} />
                  </td>
                  <td style={td}>
                    <input type="checkbox" checked={r.is_absent}
                      onChange={(e) => setRoster((rs) => rs.map((x, idx) => idx === i ? { ...x, is_absent: e.target.checked } : x))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row-actions" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
            <button onClick={saveGrades} disabled={busy}>{busy ? 'Saving…' : 'Save grades'}</button>
          </div>
        </div>
      )}

      {showNew && (
        <NewAssessment f={f} onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); toast.success('Assessment created'); loadAssessments() }} />
      )}
    </div>
  )
}

function NewAssessment({ f, onClose, onSaved }) {
  const toast = useToast()
  const [d, setD] = useState({ name: '', kind: 'ca', max_score: 20, weight: 1, date: '' })
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setBusy(true)
    try {
      await api.post('/assessments/', {
        school_class: f.school_class, subject: f.subject, term: f.term,
        name: d.name, kind: d.kind, max_score: d.max_score, weight: d.weight,
        date: d.date || null,
      })
      onSaved()
    } catch (ex) { toast.danger('Could not create assessment') }
    finally { setBusy(false) }
  }
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>New Assessment</h2>
        <form onSubmit={submit}>
          <div className="form-row"><label>Name</label><input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Sequence 1" required /></div>
          <div className="form-row"><label>Type</label>
            <select value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value })}>
              <option value="ca">Continuous Assessment</option>
              <option value="quiz">Quiz</option>
              <option value="assignment">Assignment</option>
              <option value="exam">Exam</option>
            </select>
          </div>
          <div className="form-row"><label>Max score</label><input type="number" value={d.max_score} onChange={(e) => setD({ ...d, max_score: e.target.value })} /></div>
          <div className="form-row"><label>Weight</label><input type="number" step="0.5" value={d.weight} onChange={(e) => setD({ ...d, weight: e.target.value })} /></div>
          <div className="form-row"><label>Date</label><input type="date" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} /></div>
          <div className="row-actions" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="ghost" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const th = { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid var(--border)', fontSize: 12 }
const td = { padding: '6px 10px', borderBottom: '1px solid var(--border)' }
