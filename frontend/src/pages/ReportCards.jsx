import { useEffect, useState } from 'react'
import api from '../api.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function ReportCards() {
  const [classes, setClasses] = useState([])
  const [terms, setTerms] = useState([])
  const [klass, setKlass] = useState(null)   // {id, name}
  const [term, setTerm] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/classes/', { params: { page_size: 200 } }),
      api.get('/terms/', { params: { page_size: 200 } }),
    ]).then(([c, t]) => {
      setClasses(c.data.results || c.data)
      setTerms(t.data.results || t.data)
    }).catch(() => {})
  }, [])

  async function load() {
    if (!klass || !term) return
    setLoading(true)
    try {
      const r = await api.get(`/classes/${klass.id}/rankings/`, { params: { term } })
      setRows(r.data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [klass?.id, term])

  function openPdf(studentId) {
    const token = localStorage.getItem('access_token')
    // Open the PDF in a new tab with auth via fetch -> blob URL
    fetch(`${API_URL}/academics/report-card/pdf/?student=${studentId}&term=${term}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.blob()).then((b) => window.open(URL.createObjectURL(b), '_blank'))
  }

  function downloadWord(studentId, matricule) {
    const token = localStorage.getItem('access_token')
    // Editable .docx — downloaded so it opens in Word / Google Docs.
    fetch(`${API_URL}/academics/report-card/docx/?student=${studentId}&term=${term}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.blob()).then((b) => {
      const url = URL.createObjectURL(b)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${matricule}.docx`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Report Cards</h1>
          <div className="subtitle">Auto-computed averages, grades and class ranking. Print any card as PDF.</div>
        </div>
      </div>

      <div className="card">
        <div className="grid cols-2">
          <div><label>Class</label>
            <select value={klass?.id || ''} onChange={(e) => setKlass(classes.find((c) => c.id === e.target.value))}>
              <option value="">—</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label>Term</label>
            <select value={term} onChange={(e) => setTerm(e.target.value)}>
              <option value="">—</option>
              {terms.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? <div className="card">Computing…</div> : rows.length > 0 && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Rank</th><th style={th}>Matricule</th><th style={th}>Student</th>
              <th style={{ ...th, textAlign: 'right' }}>Average /20</th>
              <th style={th}>Grade</th><th style={th}></th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student_id}>
                  <td style={td}><strong>{r.rank ?? '—'}</strong></td>
                  <td style={td}><code>{r.matricule}</code></td>
                  <td style={td}>{r.full_name}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>
                    {r.average20 == null ? '—' : r.average20.toFixed(2)}
                  </td>
                  <td style={td}><span className={`badge ${r.average20 >= 10 ? 'ok' : 'warn'}`}>{r.grade}</span></td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="ghost small" onClick={() => openPdf(r.student_id)}>🖨 PDF</button>
                      <button className="ghost small" onClick={() => downloadWord(r.student_id, r.matricule)}>📝 Word</button>
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
const td = { padding: '6px 10px', borderBottom: '1px solid var(--border)' }
