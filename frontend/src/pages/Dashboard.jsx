import { useEffect, useState } from 'react'
import api from '../api.js'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'

const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [trends, setTrends] = useState([])
  const [classes, setClasses] = useState([])

  useEffect(() => {
    api.get('/reports/summary/').then((r) => setSummary(r.data))
    api.get('/reports/payment-trends/').then((r) => setTrends(r.data))
    api.get('/reports/class-breakdown/').then((r) => setClasses(r.data))
  }, [])

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>

      <div className="grid cols-4">
        <Stat label="Total Collected" value={`${fmt(summary?.total_collected)} FCFA`} />
        <Stat label="Outstanding" value={`${fmt(summary?.outstanding)} FCFA`} accent="warn" />
        <Stat label="Active Students" value={fmt(summary?.student_count)} />
        <Stat label="Anomalies Flagged" value={fmt(summary?.anomaly_count)} accent={summary?.anomaly_count ? 'danger' : 'ok'} />
      </div>

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>Monthly Collection Trend</h2>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                <Line type="monotone" dataKey="total" stroke="#38bdf8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2>Collection by Class</h2>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classes}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="class_name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                <Bar dataKey="total" fill="#38bdf8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }) {
  const color = accent === 'danger' ? 'var(--danger)'
    : accent === 'warn' ? 'var(--warn)'
    : accent === 'ok' ? 'var(--success)'
    : 'var(--text)'
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className="value" style={{ color }}>{value}</div>
    </div>
  )
}
