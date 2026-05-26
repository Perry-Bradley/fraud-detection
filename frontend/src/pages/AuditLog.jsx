import { useEffect, useState } from 'react'
import api from '../api.js'

export default function AuditLogPage() {
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')

  async function load() {
    const r = await api.get('/audit-logs/', { params: { search: q || undefined } })
    setRows(r.data.results || r.data)
  }
  useEffect(() => { load() }, [])
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [q])

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Audit Log</h1>
      <div className="toolbar">
        <input placeholder="Search action, table, record..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="card">
        <table>
          <thead>
            <tr><th>Time</th><th>Action</th><th>Table</th><th>Record</th><th>User</th><th>Details</th></tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.timestamp).toLocaleString()}</td>
                <td><span className={`badge ${a.action.includes('ANOMALY') ? 'danger' : 'ok'}`}>{a.action}</span></td>
                <td>{a.table_name}</td>
                <td><code style={{ fontSize: 12 }}>{a.record_id}</code></td>
                <td>{a.changed_by_name || '-'}</td>
                <td><code style={{ fontSize: 11, color: 'var(--muted)' }}>{JSON.stringify(a.new_value)}</code></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)' }}>No audit entries.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
