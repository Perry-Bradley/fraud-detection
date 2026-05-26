import { useEffect, useState } from 'react'
import api from '../api.js'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts'

const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))

const METHOD_COLORS = {
  cash: '#15803d',
  bank_transfer: '#0891b2',
  mobile_money: '#d97706',
  cheque: '#9333ea',
}

export default function Reports() {
  const [trends, setTrends] = useState([])
  const [classes, setClasses] = useState([])
  const [methods, setMethods] = useState([])
  const [defaulters, setDefaulters] = useState([])
  const [funnel, setFunnel] = useState([])
  const [range, setRange] = useState('12m')

  useEffect(() => {
    Promise.all([
      api.get('/reports/payment-trends/'),
      api.get('/reports/class-breakdown/'),
      api.get('/reports/method-breakdown/'),
      api.get('/reports/top-defaulters/?limit=20'),
      api.get('/reports/intent-funnel/'),
    ]).then(([t, c, m, d, f]) => {
      setTrends(t.data); setClasses(c.data)
      setMethods(m.data); setDefaulters(d.data); setFunnel(f.data)
    }).catch(() => {})
  }, [])

  function exportCsv(name, rows, columns) {
    const header = columns.join(',') + '\n'
    const lines = rows.map((r) => columns.map((c) => `"${(r[c] ?? '').toString().replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([header + lines], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${name}.csv`
    a.click()
  }

  const filteredTrends = range === '6m' ? trends.slice(-6) : trends
  const totalCollected = trends.reduce((acc, t) => acc + Number(t.total), 0)
  const totalPayments = trends.reduce((acc, t) => acc + Number(t.count), 0)
  const totalMethods = methods.reduce((acc, m) => acc + Number(m.total), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reports & Analytics</h1>
          <div className="subtitle">Financial insights, defaulters and payment provider funnel.</div>
        </div>
        <div className="row-actions">
          <select value={range} onChange={(e) => setRange(e.target.value)} style={{ width: 140 }}>
            <option value="6m">Last 6 months</option>
            <option value="12m">Last 12 months</option>
          </select>
        </div>
      </div>

      {/* SUMMARY ROW */}
      <div className="grid cols-3">
        <div className="card stat">
          <div className="label">Total Collected (window)</div>
          <div className="value">{fmt(filteredTrends.reduce((a, t) => a + Number(t.total), 0))} FCFA</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            From {filteredTrends.length} period{filteredTrends.length === 1 ? '' : 's'}
          </div>
        </div>
        <div className="card stat">
          <div className="label">Payments Recorded</div>
          <div className="value">{fmt(filteredTrends.reduce((a, t) => a + Number(t.count), 0))}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            All-time total: {fmt(totalPayments)}
          </div>
        </div>
        <div className="card stat">
          <div className="label">Methods in Use</div>
          <div className="value">{methods.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            Most used: {methods[0]?.method?.replace('_', ' ') || '—'}
          </div>
        </div>
      </div>

      {/* COLLECTION TREND AREA */}
      <div className="card">
        <div className="card-header">
          <h2>Collection Trend</h2>
          <button className="ghost small" onClick={() => exportCsv('payment-trends', trends, ['month', 'total', 'count'])}>
            Export CSV
          </button>
        </div>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredTrends} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#15803d" stopOpacity={0.4}/>
                  <stop offset="100%" stopColor="#15803d" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#78716c" fontSize={12} />
              <YAxis stroke="#78716c" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e7e5e4', borderRadius: 8 }}
                formatter={(v) => `${fmt(v)} FCFA`}
              />
              <Area type="monotone" dataKey="total" stroke="#15803d" strokeWidth={2.5} fill="url(#repGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* METHOD + CLASS */}
      <div className="grid cols-2">
        <div className="card">
          <h2>Payment Methods</h2>
          {methods.length === 0 ? (
            <div className="empty-state"><div className="icon">∅</div><h3>No payment data</h3><p>Record a payment to see this chart.</p></div>
          ) : (
            <>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={methods} dataKey="total" nameKey="method" innerRadius={55} outerRadius={90} paddingAngle={2} label={false}>
                      {methods.map((m) => <Cell key={m.method} fill={METHOD_COLORS[m.method] || '#78716c'} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #e7e5e4', borderRadius: 8 }}
                      formatter={(v) => `${fmt(v)} FCFA`}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ marginTop: 6 }}>
                {methods.map((m) => (
                  <div key={m.method} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                    <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 999, background: METHOD_COLORS[m.method], marginRight: 8 }} />{m.method.replace('_', ' ')}</span>
                    <span style={{ color: 'var(--muted)' }}>{fmt(m.total)} FCFA · {((m.total / totalMethods) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2>By Class</h2>
            <button className="ghost small" onClick={() => exportCsv('class-breakdown', classes, ['class_name', 'total', 'count'])}>
              Export CSV
            </button>
          </div>
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
      </div>

      {/* PAYMENT INTENT FUNNEL */}
      <div className="card">
        <h2>Online Payment Funnel</h2>
        <p style={{ color: 'var(--muted)', marginTop: -8, marginBottom: 14, fontSize: 13 }}>
          Status breakdown of Campay mobile-money payment intents.
        </p>
        {funnel.length === 0 ? (
          <div className="empty-state"><div className="icon">📱</div><h3>No online payments yet</h3><p>When students pay via the portal you'll see them here.</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            {funnel.map((f) => (
              <div key={f.status} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 14, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>{f.status}</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{f.count}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DEFAULTERS */}
      <div className="card" style={{ padding: 0 }}>
        <div className="card-header" style={{ padding: '16px 22px 8px', marginBottom: 0 }}>
          <h2>Top Defaulters</h2>
          <button
            className="ghost small"
            onClick={() => exportCsv('defaulters', defaulters, ['matricule', 'full_name', 'class_name', 'outstanding'])}
          >
            Export CSV
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Matricule</th><th>Name</th><th>Class</th>
                <th style={{ textAlign: 'right' }}>Due</th>
                <th style={{ textAlign: 'right' }}>Paid</th>
                <th style={{ textAlign: 'right' }}>Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {defaulters.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><div className="icon">🎉</div><h3>Everyone's paid up</h3><p>No defaulters at this time.</p></div></td></tr>
              ) : defaulters.map((d) => (
                <tr key={d.id}>
                  <td><code>{d.matricule}</code></td>
                  <td>{d.full_name}</td>
                  <td>{d.class_name}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(d.total_due)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(d.total_paid)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--warn)', fontWeight: 600 }}>
                    {fmt(d.outstanding)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
