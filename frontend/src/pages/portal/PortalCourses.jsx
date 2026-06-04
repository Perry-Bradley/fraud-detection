import { useEffect, useState } from 'react'
import api from '../../api.js'

export default function PortalCourses() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/portal/subjects/')
      .then((r) => setRows(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>My Subjects</h1>
      <p style={{ color: 'var(--muted)', marginTop: -4 }}>
        The subjects you offer this year and the teachers who take them.
      </p>

      {rows.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 28 }}>
          No subjects have been assigned to your class yet.
        </div>
      ) : (
        <div className="grid cols-3">
          {rows.map((s) => (
            <div className="card" key={s.code}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge neutral" style={{ fontSize: 11 }}>{s.code}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Coef {s.coefficient}</span>
              </div>
              <h2 style={{ margin: '10px 0 4px', fontSize: 16 }}>{s.subject}</h2>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Teacher: {s.teacher}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
