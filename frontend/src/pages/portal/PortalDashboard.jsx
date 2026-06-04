import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api.js'
import { openAuthedFile } from '../../utils/files.js'

const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))

const ICONS = {
  pay: <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 10 9 10"/><polyline points="12 7 12 12 16 14"/></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
  results: <><circle cx="12" cy="8" r="5"/><path d="M8.2 12L7 22l5-3 5 3-1.2-10"/></>,
  timetable: <><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></>,
  book: <><path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path d="M9 8h6M9 12h6"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
}
const Icon = ({ d, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
)

export default function PortalDashboard() {
  const [bal, setBal] = useState(null)
  const [pays, setPays] = useState([])
  const [cls, setCls] = useState(null)
  const [results, setResults] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    function loadAll() {
      api.get('/portal/balance/').then((r) => setBal(r.data)).catch((e) => setErr(e.response?.data?.detail || 'Could not load balance'))
      api.get('/portal/payments/').then((r) => setPays(r.data)).catch(() => {})
      api.get('/portal/class/').then((r) => setCls(r.data)).catch(() => {})
      api.get('/portal/results/').then((r) => setResults(r.data)).catch(() => {})
    }
    loadAll()
    const t = setInterval(loadAll, 30000)   // live refresh
    return () => clearInterval(t)
  }, [])

  if (err) return <div className="card"><h2>Profile not found</h2><p>{err}</p></div>
  if (!bal) return <SkeletonPortal />

  const pct = bal.total_due > 0 ? Math.min(100, Math.round((bal.total_paid / bal.total_due) * 100)) : 0
  const recent = pays.slice(0, 5)
  const initials = (bal.full_name || 'S').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div>
      {/* HERO */}
      <div className="portal-hero">
        <div className="avatar">{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>Welcome back, {bal.full_name.split(' ')[0]}</h1>
          <div className="meta">
            <span className="meta-chip">📚 <code>{bal.class_name}</code></span>
            <span className="meta-chip">🆔 <code>{bal.matricule}</code></span>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="quick-actions">
        <Link to="/portal/pay" className="quick-action primary">
          <span className="qa-icon"><Icon d={ICONS.pay} size={14}/></span>
          Pay Online
        </Link>
        <Link to="/portal/results" className="quick-action">
          <span className="qa-icon"><Icon d={ICONS.results} size={14}/></span>
          Results
        </Link>
        <Link to="/portal/timetable" className="quick-action">
          <span className="qa-icon"><Icon d={ICONS.timetable} size={14}/></span>
          Timetable
        </Link>
        <Link to="/portal/subjects" className="quick-action">
          <span className="qa-icon"><Icon d={ICONS.book} size={14}/></span>
          Subjects
        </Link>
        <Link to="/portal/payments" className="quick-action">
          <span className="qa-icon"><Icon d={ICONS.history} size={14}/></span>
          History
        </Link>
        <Link to="/portal/settings" className="quick-action">
          <span className="qa-icon"><Icon d={ICONS.settings} size={14}/></span>
          Settings
        </Link>
      </div>

      {/* ACADEMIC SNAPSHOT */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ margin: 0 }}>Academics</h2>
          <Link to="/portal/results" style={{ fontSize: 13 }}>View results →</Link>
        </div>
        <div className="grid cols-4">
          <div className="card stat" style={{ margin: 0 }}>
            <div className="label">Class</div>
            <div className="value" style={{ fontSize: 18 }}>{bal.class_name || '—'}</div>
            {cls?.level && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{cls.level}</div>}
          </div>
          <div className="card stat" style={{ margin: 0 }}>
            <div className="label">Class Teacher</div>
            <div className="value" style={{ fontSize: 16 }}>{cls?.class_teacher || '—'}</div>
          </div>
          <div className="card stat" style={{ margin: 0 }}>
            <div className="label">Average</div>
            <div className="value" style={{ color: 'var(--primary)' }}>
              {results?.report_card?.average20 == null ? '—' : results.report_card.average20.toFixed(1)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>/ 20</div>
          </div>
          <div className="card stat" style={{ margin: 0 }}>
            <div className="label">Class Rank</div>
            <div className="value">
              {results?.report_card?.rank == null ? '—' : `${results.report_card.rank}/${results.report_card.class_size}`}
            </div>
          </div>
        </div>
      </div>

      {/* BALANCE OVERVIEW */}
      <div className="grid cols-3">
        <div className="card stat">
          <div className="label">Total Fees</div>
          <div className="value">{fmt(bal.total_due)}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>FCFA</div>
        </div>
        <div className="card stat">
          <div className="label">Paid</div>
          <div className="value" style={{ color: 'var(--success)' }}>{fmt(bal.total_paid)}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>FCFA</div>
        </div>
        <div className="card stat">
          <div className="label">Outstanding</div>
          <div className="value" style={{ color: Number(bal.outstanding) > 0 ? 'var(--warn)' : 'var(--success)' }}>
            {fmt(bal.outstanding)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>FCFA</div>
        </div>
      </div>

      {/* PAY ONLINE CTA */}
      {Number(bal.outstanding) > 0 && (
        <div className="card card-highlight">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>💸 Pay your fees from your phone</h2>
              <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: 13 }}>
                Settle {fmt(bal.outstanding)} FCFA via MTN MoMo or Orange Money.
              </p>
            </div>
            <Link to="/portal/pay"><button>Pay Now →</button></Link>
          </div>
        </div>
      )}

      {/* PAYMENT PROGRESS */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Payment Progress</h2>
          <span style={{ fontWeight: 700, fontSize: 18, color: pct >= 100 ? 'var(--success)' : 'var(--primary)' }}>
            {pct}%
          </span>
        </div>
        <div style={{ background: 'var(--surface-2)', borderRadius: 999, height: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{
            width: `${pct}%`,
            height: '100%',
            background: pct >= 100 ? 'linear-gradient(90deg, #16a34a, #15803d)' : 'linear-gradient(90deg, #15803d, #65a30d)',
            transition: 'width .5s ease',
            borderRadius: 999,
          }} />
        </div>
        <p style={{ color: 'var(--muted)', marginTop: 10, marginBottom: 0, fontSize: 13 }}>
          {pct >= 100 ? '🎉 Fully settled — thank you!' : `${fmt(bal.outstanding)} FCFA remaining`}
        </p>
      </div>

      {/* RECENT PAYMENTS - dual view */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ margin: 0 }}>Recent Payments</h2>
          {pays.length > 0 && <Link to="/portal/payments" style={{ fontSize: 13 }}>View all →</Link>}
        </div>

        {recent.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <div className="icon">💰</div>
            <h3>No payments yet</h3>
            <p>When you pay, your receipts will appear here.</p>
          </div>
        ) : (
          <>
            <div className="desktop-only table-wrap">
              <table>
                <thead>
                  <tr><th>Receipt</th><th>Date</th><th style={{ textAlign: 'right' }}>Amount</th><th>Method</th><th></th></tr>
                </thead>
                <tbody>
                  {recent.map((p) => (
                    <tr key={p.id}>
                      <td><code>{p.receipt_no}</code></td>
                      <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(p.amount)}</td>
                      <td><span className="badge neutral">{p.method.replace('_', ' ')}</span></td>
                      <td><a href="#" onClick={(e) => { e.preventDefault(); openAuthedFile(`/portal/payments/${p.id}/receipt/`) }}>Receipt</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-only card-list">
              {recent.map((p) => (
                <div key={p.id} className="list-card">
                  <div className="lc-main">
                    <div className="lc-title">{fmt(p.amount)} FCFA</div>
                    <div className="lc-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className="badge neutral" style={{ fontSize: 10 }}>{p.method.replace('_', ' ')}</span>
                      <span>{new Date(p.payment_date).toLocaleDateString()}</span>
                    </div>
                    <div className="lc-meta" style={{ marginTop: 4 }}>
                      <code style={{ fontSize: 10 }}>{p.receipt_no}</code>
                    </div>
                  </div>
                  <div className="lc-side">
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); openAuthedFile(`/portal/payments/${p.id}/receipt/`) }}
                      style={{ fontSize: 12 }}
                    >
                      Receipt →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SkeletonPortal() {
  return (
    <div>
      <div className="portal-hero">
        <div className="skeleton" style={{ width: 60, height: 60, borderRadius: 16 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 22, width: '50%', marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 12, width: '40%' }} />
        </div>
      </div>
      <div className="grid cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card stat">
            <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 26, width: '70%' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
