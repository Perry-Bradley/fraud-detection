import { useEffect, useState } from 'react'
import api from '../api.js'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))

export default function Reports() {
  const [trends, setTrends] = useState([])
  const [classes, setClasses] = useState([])

  useEffect(() => {
    api.get('/reports/payment-trends/').then((r) => setTrends(r.data))
    api.get('/reports/class-breakdown/').then((r) => setClasses(r.data))
  }, [])

  function exportCsv() {
    const header = 'month,total,count\n'
    const lines = trends.map((t) => `${t.month},${t.total},${t.count}`).join('\n')
    const blob = new Blob([header + lines], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'payment-trends.csv'
    a.click()
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Reports</h1>
      <div className="toolbar">
        <button onClick={exportCsv}>Export Trends CSV</button>
      </div>

      <div className="card">
        <h2>Payment Trends (last 12 months)</h2>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trends}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
              <Bar dataKey="total" fill="#38bdf8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2>By Class</h2>
        <table>
          <thead><tr><th>Class</th><th>Total Collected</th><th># Payments</th></tr></thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.class_name}>
                <td>{c.class_name}</td>
                <td>{fmt(c.total)} FCFA</td>
                <td>{c.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
