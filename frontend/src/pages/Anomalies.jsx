import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api.js'
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import DataTable from '../components/DataTable.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))

const STATUS_BADGE = {
  open: 'danger',
  investigating: 'warn',
  confirmed: 'danger',
  dismissed: 'neutral',
}
const STATUS_LABEL = {
  open: 'Open',
  investigating: 'Investigating',
  confirmed: 'Confirmed Fraud',
  dismissed: 'Dismissed',
}

export default function Anomalies() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [summary, setSummary] = useState(null)
  const [trend, setTrend] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open') // open | all | confirmed | dismissed
  const [selected, setSelected] = useState(null)

  const toast = useToast()

  const EMPTY_SUMMARY = {
    total_flagged: 0, open: 0, confirmed: 0, dismissed: 0, investigating: 0,
    this_week: 0, avg_score: 0, total_flagged_amount: 0, confirmed_fraud_amount: 0,
    top_reasons: [], top_flagged_students: [],
  }

  async function load() {
    setLoading(true)
    try {
      const results = await Promise.allSettled([
        api.get('/reports/anomaly-summary/'),
        api.get('/reports/anomaly-trend/'),
        api.get('/payments/', { params: { is_anomalous: true, page_size: 500 } }),
      ])
      const [s, t, p] = results
      setSummary(s.status === 'fulfilled' ? s.value.data : EMPTY_SUMMARY)
      setTrend(t.status === 'fulfilled' ? t.value.data : [])
      setRows(p.status === 'fulfilled' ? (p.value.data.results || p.value.data) : [])
      const failed = results.filter((r) => r.status === 'rejected')
      if (failed.length) {
        const status = failed[0].reason?.response?.status
        if (status === 404) toast.warn('Backend needs rebuild — Fraud endpoints not deployed yet')
        else toast.danger(`Could not load anomalies (${status || 'network error'})`)
      }
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter((r) => {
    if (filter === 'all') return true
    return r.review_status === filter
  })

  const columns = [
    {
      key: 'payment_date', label: 'Date', sortable: true,
      render: (p) => new Date(p.payment_date).toLocaleString(),
    },
    { key: 'receipt_no', label: 'Receipt', render: (p) => <code>{p.receipt_no}</code> },
    {
      key: 'student_name', label: 'Student', sortable: true,
      render: (p) => (
        <div>
          <div>{p.student_name}</div>
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>{p.student_matricule} · {p.student_class}</div>
        </div>
      ),
    },
    {
      key: 'amount', label: 'Amount', sortable: true, align: 'right',
      render: (p) => <strong>{fmt(p.amount)}</strong>,
    },
    { key: 'method', label: 'Method', render: (p) => <span className="badge neutral">{p.method.replace('_', ' ')}</span> },
    {
      key: 'anomaly_score', label: 'Score', sortable: true, align: 'left',
      render: (p) => <ScoreBar score={Number(p.anomaly_score)} />,
    },
    {
      key: 'anomaly_reason', label: 'Reason',
      render: (p) => <span style={{ fontSize: 13 }}>{p.anomaly_reason || <em style={{ color: 'var(--muted)' }}>—</em>}</span>,
    },
    {
      key: 'review_status', label: 'Status',
      render: (p) => <span className={`badge ${STATUS_BADGE[p.review_status] || 'neutral'}`}>{STATUS_LABEL[p.review_status] || p.review_status}</span>,
    },
    {
      key: '_actions', label: '',
      render: (p) => <button className="ghost small" onClick={() => setSelected(p)}>Review</button>,
    },
  ]

  if (!summary) return <SkeletonAnomalies />

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🛡️ Fraud Detection</h1>
          <div className="subtitle">
            Transactions flagged by the AI model · review and triage suspicious payments.
          </div>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid cols-4">
        <Kpi
          label="Open (Awaiting Review)"
          value={summary.open}
          accent={summary.open > 0 ? 'danger' : 'ok'}
        />
        <Kpi
          label="Confirmed Fraud"
          value={summary.confirmed}
          subtitle={`${fmt(summary.confirmed_fraud_amount)} FCFA blocked`}
          accent="danger"
        />
        <Kpi
          label="This Week"
          value={summary.this_week}
          subtitle={`Avg score: ${summary.avg_score}`}
        />
        <Kpi
          label="Total Flagged"
          value={summary.total_flagged}
          subtitle={`${fmt(summary.total_flagged_amount)} FCFA total`}
        />
      </div>

      <div className="grid cols-2">
        {/* TREND */}
        <div className="card">
          <h2>Detection Trend (last 30 days)</h2>
          {trend.length === 0 ? (
            <div className="empty-state" style={{ padding: 28 }}>
              <div className="icon">🎉</div>
              <h3>No anomalies in 30 days</h3>
              <p>Your fraud detector hasn't flagged anything recently.</p>
            </div>
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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

        {/* TOP REASONS */}
        <div className="card">
          <h2>Most Common Reasons</h2>
          {summary.top_reasons.length === 0 ? (
            <div className="empty-state" style={{ padding: 28 }}>
              <div className="icon">🧠</div>
              <h3>No data yet</h3>
              <p>Reasons accumulate as the AI flags transactions.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {summary.top_reasons.map((r, i) => {
                const max = Math.max(...summary.top_reasons.map((x) => x.count))
                const pct = (r.count / max) * 100
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>{r.anomaly_reason}</span>
                      <strong>{r.count}</strong>
                    </div>
                    <div style={{ background: 'var(--surface-2)', borderRadius: 999, height: 8 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--danger)', borderRadius: 999 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* TOP FLAGGED STUDENTS */}
      <div className="card">
        <h2>Most Flagged Students</h2>
        {summary.top_flagged_students.length === 0 ? (
          <div className="empty-state" style={{ padding: 28 }}>
            <div className="icon">✔️</div>
            <h3>No repeat offenders</h3>
            <p>No students have multiple flagged payments.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Matricule</th><th>Name</th><th>Class</th>
                  <th style={{ textAlign: 'right' }}># Flagged</th>
                  <th style={{ textAlign: 'right' }}>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {summary.top_flagged_students.map((s) => (
                  <tr key={s.id}>
                    <td><code>{s.matricule}</code></td>
                    <td><Link to={`/staff/students/${s.id}`}>{s.full_name}</Link></td>
                    <td>{s.class_name}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="badge danger">{s.count}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{fmt(s.total)} FCFA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FILTER + TABLE */}
      <div className="page-header" style={{ marginTop: 24, marginBottom: 12 }}>
        <h2 style={{ fontSize: 18 }}>Flagged Transactions</h2>
        <div className="row-actions">
          <FilterChip active={filter === 'open'} count={summary.open} onClick={() => setFilter('open')} label="Open" />
          <FilterChip active={filter === 'investigating'} count={summary.investigating} onClick={() => setFilter('investigating')} label="Investigating" />
          <FilterChip active={filter === 'confirmed'} count={summary.confirmed} onClick={() => setFilter('confirmed')} label="Confirmed" />
          <FilterChip active={filter === 'dismissed'} count={summary.dismissed} onClick={() => setFilter('dismissed')} label="Dismissed" />
          <FilterChip active={filter === 'all'} count={summary.total_flagged} onClick={() => setFilter('all')} label="All" />
        </div>
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        loading={loading}
        searchKeys={['receipt_no', 'student_name', 'student_matricule', 'anomaly_reason']}
        searchPlaceholder="Search by receipt, student, reason..."
        emptyIcon="🛡️"
        emptyTitle={filter === 'open' ? 'No open anomalies' : 'No matching anomalies'}
        emptySubtitle={filter === 'open' ? 'All flagged transactions have been reviewed.' : 'Try a different filter.'}
        initialSort={{ key: 'payment_date', dir: 'desc' }}
      />

      {selected && (
        <ReviewModal
          payment={selected}
          canReview={isAdmin}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); load() }}
        />
      )}
    </div>
  )
}

function FilterChip({ active, count, onClick, label }) {
  return (
    <button
      className={active ? '' : 'ghost'}
      onClick={onClick}
      style={{ fontSize: 12, padding: '6px 12px' }}
    >
      {label} <span style={{ opacity: 0.7, marginLeft: 4 }}>({count ?? 0})</span>
    </button>
  )
}

function Kpi({ label, value, subtitle, accent }) {
  const color = accent === 'danger' ? 'var(--danger)' : accent === 'warn' ? 'var(--warn)' : accent === 'ok' ? 'var(--success)' : 'var(--text)'
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className="value" style={{ color }}>{value}</div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{subtitle}</div>}
    </div>
  )
}

function ScoreBar({ score }) {
  if (score == null || isNaN(score)) return <span style={{ color: 'var(--muted)' }}>—</span>
  const pct = Math.max(0, Math.min(1, score)) * 100
  const color = score >= 0.9 ? '#dc2626' : score >= 0.6 ? '#d97706' : '#facc15'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
      </div>
      <strong style={{ fontSize: 12, color, minWidth: 36, textAlign: 'right' }}>{score.toFixed(2)}</strong>
    </div>
  )
}

function ReviewModal({ payment, canReview, onClose, onSaved }) {
  const toast = useToast()
  const [status, setStatus] = useState(payment.review_status === 'open' ? 'confirmed' : payment.review_status)
  const [note, setNote] = useState(payment.review_note || '')
  const [busy, setBusy] = useState(false)

  async function submit(newStatus) {
    setBusy(true)
    try {
      await api.post(`/payments/${payment.id}/review/`, { status: newStatus, note })
      toast.success(`Marked as ${STATUS_LABEL[newStatus]}`)
      onSaved()
    } catch (ex) {
      toast.danger('Could not save review')
    } finally { setBusy(false) }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>🛡️ Anomaly Review</h2>
            <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 13 }}>
              Receipt <code>{payment.receipt_no}</code>
            </p>
          </div>
          <button className="ghost small" onClick={onClose}>✕</button>
        </div>

        <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 14, marginTop: 14 }}>
          <div className="grid cols-2" style={{ gap: 10 }}>
            <Field label="Student">
              <Link to={`/staff/students/${payment.student}`}>{payment.student_name}</Link>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>{payment.student_matricule} · {payment.student_class}</div>
            </Field>
            <Field label="Amount">
              <strong style={{ fontSize: 18 }}>{fmt(payment.amount)} FCFA</strong>
            </Field>
            <Field label="Method">
              {payment.method.replace('_', ' ')}
            </Field>
            <Field label="Date">
              {new Date(payment.payment_date).toLocaleString()}
            </Field>
            <Field label="Reference">
              {payment.reference || <em style={{ color: 'var(--muted)' }}>none</em>}
            </Field>
            <Field label="Recorded By">
              {payment.recorded_by_name || 'system'}
            </Field>
          </div>
        </div>

        <div style={{ marginTop: 14, padding: 14, background: 'var(--danger-tint)', borderRadius: 8, borderLeft: '4px solid var(--danger)' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 600, color: '#7f1d1d', letterSpacing: '.06em' }}>
            AI Detection
          </div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#7f1d1d' }}>
              Score {Number(payment.anomaly_score).toFixed(2)}
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <ScoreBar score={Number(payment.anomaly_score)} />
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 14, color: '#7f1d1d' }}>
            <strong>Reason:</strong> {payment.anomaly_reason || 'Pattern deviates from this student\'s history'}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="form-row">
            <label>Current Status</label>
            <div>
              <span className={`badge ${STATUS_BADGE[payment.review_status] || 'neutral'}`}>
                {STATUS_LABEL[payment.review_status] || payment.review_status}
              </span>
              {payment.reviewed_by && (
                <span style={{ marginLeft: 10, color: 'var(--muted)', fontSize: 13 }}>
                  by {payment.reviewed_by} on {new Date(payment.reviewed_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {canReview ? (
            <>
              <div className="form-row">
                <label>Review note</label>
                <textarea
                  rows="3"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What did you find? Optional but recommended for the audit trail."
                />
              </div>

              <div className="row-actions" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button className="ghost" onClick={() => submit('investigating')} disabled={busy}>
                  Investigating
                </button>
                <button className="ghost" onClick={() => submit('dismissed')} disabled={busy}>
                  Dismiss (False Positive)
                </button>
                <button className="danger" onClick={() => submit('confirmed')} disabled={busy}>
                  Confirm Fraud
                </button>
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 12 }}>
              Only administrators can review anomalies.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14 }}>{children}</div>
    </div>
  )
}

function SkeletonAnomalies() {
  return (
    <div>
      <div className="page-header"><h1>🛡️ Fraud Detection</h1></div>
      <div className="grid cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card stat">
            <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 28, width: '50%' }} />
          </div>
        ))}
      </div>
      <div className="card"><div className="skeleton" style={{ height: 240 }} /></div>
    </div>
  )
}
