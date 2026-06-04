import { useEffect, useState } from 'react'
import api from '../../api.js'

export default function PortalResults() {
  const [data, setData] = useState(null)
  const [term, setTerm] = useState('')
  const [loading, setLoading] = useState(true)

  async function load(termId) {
    setLoading(true)
    try {
      const r = await api.get('/portal/results/', { params: termId ? { term: termId } : {} })
      setData(r.data)
      if (r.data.term) setTerm(r.data.term.id)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  if (loading && !data) return <div>Loading...</div>

  const rc = data?.report_card
  const subjects = rc?.subjects || []
  const exams = data?.exam_results || []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 4 }}>My Results</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>Your continuous-assessment grades and exam results.</p>
        </div>
        {data?.terms?.length > 0 && (
          <select value={term} onChange={(e) => { setTerm(e.target.value); load(e.target.value) }}>
            {data.terms.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        )}
      </div>

      {!rc || subjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 28, marginTop: 16 }}>
          No results have been published yet{data?.term ? ` for ${data.term.label}` : ''}.
        </div>
      ) : (
        <>
          {/* Summary hero */}
          <div className="grid cols-3" style={{ marginTop: 16 }}>
            <div className="card stat">
              <div className="label">Overall Average</div>
              <div className="value">{rc.average20 == null ? '—' : `${rc.average20.toFixed(2)} / 20`}</div>
            </div>
            <div className="card stat">
              <div className="label">Grade</div>
              <div className="value" style={{ color: 'var(--primary)' }}>{rc.grade}</div>
            </div>
            <div className="card stat">
              <div className="label">Class Rank</div>
              <div className="value">{rc.rank == null ? '—' : `${rc.rank} / ${rc.class_size}`}</div>
            </div>
          </div>

          {/* Subjects table */}
          <div className="card" style={{ overflowX: 'auto' }}>
            <h2 style={{ marginTop: 0 }}>Subjects</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
              <thead>
                <tr>
                  <th style={th}>Subject</th>
                  <th style={{ ...th, textAlign: 'center' }}>Coef</th>
                  <th style={{ ...th, textAlign: 'right' }}>Avg /20</th>
                  <th style={{ ...th, textAlign: 'center' }}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.subject_code}>
                    <td style={td}>{s.subject_name}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{s.coefficient}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{s.average20 == null ? '—' : s.average20.toFixed(2)}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span className={`badge ${s.average20 >= 10 ? 'ok' : 'warn'}`}>{s.grade}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Exam results */}
      {exams.length > 0 && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <h2 style={{ marginTop: 0 }}>Exam Results</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
            <thead>
              <tr>
                <th style={th}>Exam</th><th style={th}>Subject</th>
                <th style={{ ...th, textAlign: 'right' }}>Score</th><th style={{ ...th, textAlign: 'center' }}>Result</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e, i) => (
                <tr key={i}>
                  <td style={td}>{e.session}</td>
                  <td style={td}>{e.subject}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{e.score ?? '—'}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <span className={`badge ${e.passed ? 'ok' : 'warn'}`}>{e.passed == null ? '—' : e.passed ? 'PASS' : 'FAIL'}</span>
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
const td = { padding: '7px 10px', borderBottom: '1px solid var(--border)' }
