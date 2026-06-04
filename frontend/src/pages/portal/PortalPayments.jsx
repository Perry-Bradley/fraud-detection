import { useEffect, useMemo, useState } from 'react'
import api from '../../api.js'

const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))

export default function PortalPayments() {
  const [pays, setPays] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [method, setMethod] = useState('')

  useEffect(() => {
    api.get('/portal/payments/').then((r) => setPays(r.data)).finally(() => setLoading(false))
  }, [])

  function exportCsv() {
    const header = 'receipt_no,date,amount,method,reference\n'
    const lines = pays.map((p) => `${p.receipt_no},${p.payment_date},${p.amount},${p.method},${p.reference || ''}`).join('\n')
    const blob = new Blob([header + lines], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'my-payments.csv'
    a.click()
  }

  const filtered = useMemo(() => {
    const needle = q.toLowerCase()
    return pays.filter((p) => {
      if (method && p.method !== method) return false
      if (!needle) return true
      return (
        p.receipt_no.toLowerCase().includes(needle) ||
        (p.reference || '').toLowerCase().includes(needle) ||
        p.method.toLowerCase().includes(needle)
      )
    })
  }, [pays, q, method])

  const total = filtered.reduce((acc, p) => acc + Number(p.amount), 0)
  const allMethods = [...new Set(pays.map((p) => p.method))]

  if (loading) return <SkeletonList />

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Payment History</h1>
          <div className="subtitle">
            {pays.length} payment{pays.length === 1 ? '' : 's'} on record
          </div>
        </div>
        {pays.length > 0 && (
          <div className="row-actions">
            <button className="ghost" onClick={exportCsv}>📥 Export CSV</button>
          </div>
        )}
      </div>

      {/* Summary card */}
      <div className="grid cols-2">
        <div className="card stat">
          <div className="label">Showing</div>
          <div className="value">{filtered.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            of {pays.length} payment{pays.length === 1 ? '' : 's'}
          </div>
        </div>
        <div className="card stat">
          <div className="label">Total Paid</div>
          <div className="value" style={{ color: 'var(--success)' }}>{fmt(total)}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>FCFA</div>
        </div>
      </div>

      {/* Filters */}
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input
            placeholder="Search by receipt or reference..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {allMethods.length > 1 && (
          <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ width: 180 }}>
            <option value="">All methods</option>
            {allMethods.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="icon">{pays.length === 0 ? '💰' : '🔍'}</div>
            <h3>{pays.length === 0 ? 'No payments yet' : 'No matching payments'}</h3>
            <p>
              {pays.length === 0
                ? "When you pay, your receipts will appear here. Contact the bursary if you've paid in cash."
                : 'Try clearing the search or filter.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card desktop-only" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td><code>{p.receipt_no}</code></td>
                      <td>{new Date(p.payment_date).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(p.amount)}</td>
                      <td><span className="badge neutral">{p.method.replace('_', ' ')}</span></td>
                      <td>{p.reference || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                      <td>
                        <a href={`${api.defaults.baseURL}/portal/payments/${p.id}/receipt/`} target="_blank" rel="noreferrer">
                          PDF →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="mobile-only card-list">
            {filtered.map((p) => (
              <div key={p.id} className="list-card">
                <div className="lc-main">
                  <div className="lc-title" style={{ fontSize: 17 }}>{fmt(p.amount)} <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>FCFA</span></div>
                  <div className="lc-subtitle" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 3 }}>
                    <span className="badge neutral" style={{ fontSize: 10 }}>{p.method.replace('_', ' ')}</span>
                    <span>{new Date(p.payment_date).toLocaleDateString()}</span>
                  </div>
                  <div className="lc-meta" style={{ marginTop: 6 }}>
                    <code style={{ fontSize: 10 }}>{p.receipt_no}</code>
                    {p.reference && (
                      <span style={{ marginLeft: 8 }}>ref: {p.reference}</span>
                    )}
                  </div>
                </div>
                <div className="lc-side">
                  <a
                    href={`${api.defaults.baseURL}/portal/payments/${p.id}/receipt/`}
                    target="_blank" rel="noreferrer"
                    className="btn ghost small"
                    style={{ textDecoration: 'none' }}
                  >
                    Receipt
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SkeletonList() {
  return (
    <div>
      <div className="page-header"><h1>Payment History</h1></div>
      <div className="grid cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="card stat">
            <div className="skeleton" style={{ height: 12, width: '50%', marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 26, width: '60%' }} />
          </div>
        ))}
      </div>
      <div className="card">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ height: 50, marginBottom: 8 }} />
        ))}
      </div>
    </div>
  )
}
