import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api.js'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts'

const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))
const fmtPct = (n) => (n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(1)}%`)

const METHOD_COLORS = {
  cash: '#15803d',
  bank_transfer: '#0891b2',
  mobile_money: '#d97706',
  cheque: '#9333ea',
}
const METHOD_LABELS = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money',
  cheque: 'Cheque',
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [trends, setTrends] = useState([])
  const [classes, setClasses] = useState([])
  const [methods, setMethods] = useState([])
  const [defaulters, setDefaulters] = useState([])
  const [anomalyTrend, setAnomalyTrend] = useState([])
  const [feed, setFeed] = useState([])

  useEffect(() => {
    Promise.all([
      api.get('/reports/summary/'),
      api.get('/reports/payment-trends/'),
      api.get('/reports/class-breakdown/'),
      api.get('/reports/method-breakdown/'),
      api.get('/reports/top-defaulters/?limit=8'),
      api.get('/reports/anomaly-trend/'),
      api.get('/reports/activity-feed/'),
    ]).then(([s, t, c, m, d, a, f]) => {
      setSummary(s.data); setTrends(t.data); setClasses(c.data)
      setMethods(m.data); setDefaulters(d.data); setAnomalyTrend(a.data); setFeed(f.data)
    }).catch(() => {})
  }, [])

  if (!summary) return <SkeletonDashboard />

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <div className="subtitle">Real-time view of fee collection and student accounts.</div>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid cols-4">
        <Kpi
          label="Collected This Month"
          value={`${fmt(summary.this_month)} FCFA`}
          delta={summary.delta_pct}
        />
        <Kpi
          label="Outstanding"
          value={`${fmt(summary.outstanding)} FCFA`}
          accent={summary.outstanding > 0 ? 'warn' : 'ok'}
          subtitle={`${summary.defaulters_count} student${summary.defaulters_count === 1 ? '' : 's'} with balance`}
        />
        <Kpi
          label="Active Students"
          value={fmt(summary.student_count)}
          subtitle={`Avg payment: ${fmt(summary.avg_payment)} FCFA`}
        />
        <Kpi
          label="Anomalies"
          value={fmt(summary.anomaly_count)}
          accent={summary.anomaly_count ? 'danger' : 'ok'}
          subtitle="Flagged by AI"
        />
      </div>

      {/* COLLECTION RATE + METHOD BREAKDOWN */}
      <div className="grid cols-3" style={{ marginTop: 4 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2>Collection Rate</h2>
          <div className="gauge-wrap" style={{ flex: 1, justifyContent: 'center' }}>
            <div className="gauge" style={{ '--pct': summary.collection_rate }}>
              <span className="gauge-value">{summary.collection_rate}%</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              <div><strong style={{ color: 'var(--text)' }}>{fmt(summary.total_paid)}</strong> paid</div>
              <div>of {fmt(summary.total_due)} FCFA total due</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Payment Methods</h2>
          {methods.length === 0 ? (
            <EmptyMini label="No payments yet" />
          ) : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={methods.map((m) => ({ ...m, name: METHOD_LABELS[m.method] || m.method }))}
                    dataKey="total"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {methods.map((m) => (
                      <Cell key={m.method} fill={METHOD_COLORS[m.method] || '#78716c'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => `${fmt(v)} FCFA`}
                    contentStyle={{ background: '#fff', border: '1px solid #e7e5e4', borderRadius: 8 }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <h2>This vs Last Month</h2>
          <div style={{ display: 'flex', gap: 20, padding: '10px 0' }}>
            <Compare label="Last" value={summary.last_month} muted />
            <div style={{ borderLeft: '1px solid var(--border)' }} />
            <Compare label="This" value={summary.this_month} highlight />
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--muted)' }}>
            {summary.delta_pct == null
              ? 'Not enough history to compare.'
              : <>Change: <DeltaBadge value={summary.delta_pct} /></>}
          </div>
        </div>
      </div>

      {/* COLLECTION TREND (area) */}
      <div className="card">
        <h2>12-Month Collection Trend</h2>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#15803d" stopOpacity={0.35}/>
                  <stop offset="100%" stopColor="#15803d" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#78716c" fontSize={12} />
              <YAxis stroke="#78716c" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e7e5e4', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}
                formatter={(v) => `${fmt(v)} FCFA`}
              />
              <Area type="monotone" dataKey="total" stroke="#15803d" strokeWidth={2.5} fill="url(#trendGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid cols-2">
        {/* CLASS BREAKDOWN */}
        <div className="card">
          <h2>Collection by Class</h2>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classes} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
                <XAxis dataKey="class_name" stroke="#78716c" fontSize={12} />
                <YAxis stroke="#78716c" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e7e5e4', borderRadius: 8 }}
                  formatter={(v) => `${fmt(v)} FCFA`}
                  cursor={{ fill: 'rgba(21, 128, 61, 0.06)' }}
                />
                <Bar dataKey="total" fill="#15803d" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ANOMALY TREND */}
        <div className="card">
          <h2>Anomaly Detection (30 days)</h2>
          {anomalyTrend.length === 0 ? (
            <EmptyMini label="No anomalies in the last 30 days 🎉" />
          ) : (
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={anomalyTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="#78716c" fontSize={11} />
                  <YAxis stroke="#78716c" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e7e5e4', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="count" stroke="#dc2626" strokeWidth={2.5} dot={{ fill: '#dc2626', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid cols-2">
        {/* TOP DEFAULTERS */}
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ padding: '16px 22px 8px', marginBottom: 0 }}>
            <h2>Top Defaulters</h2>
            <Link to="/staff/students" style={{ fontSize: 13 }}>All students →</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Matricule</th><th>Name</th><th>Class</th><th style={{ textAlign: 'right' }}>Outstanding</th></tr></thead>
              <tbody>
                {defaulters.length === 0 ? (
                  <tr><td colSpan={4}><div className="empty-state"><div className="icon">🎉</div><h3>Everyone's paid up</h3><p>No outstanding balances right now.</p></div></td></tr>
                ) : defaulters.map((d) => (
                  <tr key={d.id}>
                    <td><code>{d.matricule}</code></td>
                    <td><Link to={`/staff/students/${d.id}`}>{d.full_name}</Link></td>
                    <td>{d.class_name}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--warn)' }}>
                      {fmt(d.outstanding)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ACTIVITY FEED */}
        <div className="card">
          <h2>Recent Activity</h2>
          {feed.length === 0 ? <EmptyMini label="No recent activity" /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
              {feed.map((f) => (
                <div key={f.id} style={{ display: 'flex', gap: 10, alignItems: 'start', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <ActivityIcon action={f.action} />
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <div><strong>{prettyAction(f.action)}</strong></div>
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                      {f.user} · {timeAgo(f.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, delta, subtitle, accent }) {
  const color = accent === 'danger' ? 'var(--danger)' : accent === 'warn' ? 'var(--warn)' : accent === 'ok' ? 'var(--success)' : 'var(--text)'
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className="value" style={{ color }}>{value}</div>
      {delta != null && <DeltaBadge value={delta} />}
      {subtitle && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{subtitle}</div>}
    </div>
  )
}

function DeltaBadge({ value }) {
  if (value == null) return null
  const cls = value > 0.5 ? 'up' : value < -0.5 ? 'down' : 'flat'
  const arrow = value > 0.5 ? '↑' : value < -0.5 ? '↓' : '→'
  return <span className={`delta ${cls}`}>{arrow} {fmtPct(value)}</span>
}

function Compare({ label, value, highlight, muted }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>{label}</div>
      <div style={{
        fontSize: 22, fontWeight: 700, marginTop: 4,
        color: highlight ? 'var(--primary)' : muted ? 'var(--muted)' : 'var(--text)',
      }}>{fmt(value)}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>FCFA</div>
    </div>
  )
}

function EmptyMini({ label }) {
  return <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>{label}</div>
}

function SkeletonDashboard() {
  return (
    <div>
      <div className="page-header"><h1>Dashboard</h1></div>
      <div className="grid cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card stat">
            <div className="skeleton" style={{ width: '60%', height: 12, marginBottom: 10 }} />
            <div className="skeleton" style={{ width: '80%', height: 28 }} />
          </div>
        ))}
      </div>
      <div className="card"><div className="skeleton" style={{ height: 220, width: '100%' }} /></div>
    </div>
  )
}

function ActivityIcon({ action }) {
  const m = {
    PAYMENT_CREATED: { color: 'var(--success)', glyph: '$' },
    PAYMENT_CREATED_ONLINE: { color: 'var(--info)', glyph: '📱' },
    ANOMALY_DETECTED: { color: 'var(--danger)', glyph: '!' },
    LOGIN: { color: 'var(--muted)', glyph: '→' },
  }
  const cfg = m[action] || { color: 'var(--muted)', glyph: '•' }
  return (
    <span style={{
      width: 28, height: 28, borderRadius: 999,
      background: 'var(--surface-2)', color: cfg.color,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, flexShrink: 0,
    }}>
      {cfg.glyph}
    </span>
  )
}

function prettyAction(a) {
  return ({
    PAYMENT_CREATED: 'Payment recorded',
    PAYMENT_CREATED_ONLINE: 'Online payment received',
    ANOMALY_DETECTED: 'Anomaly flagged by AI',
    LOGIN: 'User signed in',
  }[a]) || a.replaceAll('_', ' ').toLowerCase()
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(iso).toLocaleDateString()
}
