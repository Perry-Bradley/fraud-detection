import { useEffect, useState } from 'react'
import api from '../../api.js'

export default function PortalTimetable() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const r = await api.get('/portal/timetable/')
      setData(r.data)
    } finally { setLoading(false) }
  }
  useEffect(() => {
    load()
    const t = setInterval(load, 30000)   // keep it fresh
    return () => clearInterval(t)
  }, [])

  if (loading) return <div>Loading...</div>

  const periods = data?.periods || []
  const days = (data?.days || []).slice(0, 5)
  const hasAny = periods.length > 0

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>My Timetable</h1>
      <p style={{ color: 'var(--muted)', marginTop: -4 }}>
        Weekly schedule for <strong>{data?.class_name}</strong>.
      </p>

      <div className="card" style={{ overflowX: 'auto' }}>
        {!hasAny ? (
          <div style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>
            Your timetable hasn’t been published yet. Check back soon.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr>
                <th style={th}>Day</th>
                {periods.map((p) => (
                  <th key={p.id} style={th}>
                    P{p.ordinal}
                    {p.start_time && <div style={{ fontWeight: 400, fontSize: 10, color: 'var(--muted)' }}>{p.start_time.slice(0, 5)}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.day}>
                  <td style={{ ...td, fontWeight: 600 }}>{d.label}</td>
                  {periods.map((p) => {
                    const cell = data.grid?.[d.day]?.slots?.[p.ordinal]
                    return (
                      <td key={p.id} style={td}>
                        {cell ? (
                          <div style={{ background: 'var(--primary-soft)', borderRadius: 6, padding: '5px 7px', fontSize: 12, lineHeight: 1.3 }}>
                            <strong>{cell.subject_code}</strong>
                            <div style={{ color: 'var(--muted)', fontSize: 10 }}>
                              {cell.teacher_name || ''}{cell.room_name ? ` · ${cell.room_name}` : ''}
                            </div>
                          </div>
                        ) : <span style={{ color: '#d6d3d1' }}>—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const th = { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid var(--border)', fontSize: 12 }
const td = { padding: '6px 8px', borderBottom: '1px solid var(--border)', verticalAlign: 'top', minWidth: 92 }
