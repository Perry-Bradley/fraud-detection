import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api.js'

const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))

export default function PortalDashboard() {
  const [bal, setBal] = useState(null)
  const [pays, setPays] = useState([])
  const [err, setErr] = useState(null)

  useEffect(() => {
    api.get('/portal/balance/').then((r) => setBal(r.data)).catch((e) => setErr(e.response?.data?.detail || 'Could not load balance'))
    api.get('/portal/payments/').then((r) => setPays(r.data))
  }, [])

  if (err) return <div className="card"><h2>Profile not found</h2><p>{err}</p></div>
  if (!bal) return <div>Loading...</div>

  const pct = bal.total_due > 0 ? Math.min(100, Math.round((bal.total_paid / bal.total_due) * 100)) : 0
  const recent = pays.slice(0, 5)

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Welcome, {bal.full_name}</h1>
      <p style={{ color: 'var(--muted)', marginTop: -8 }}>
        Matricule <strong>{bal.matricule}</strong> · Class <strong>{bal.class_name}</strong>
      </p>

      <div className="grid cols-3">
        <div className="card stat">
          <div className="label">Total Fees Due</div>
          <div className="value">{fmt(bal.total_due)} FCFA</div>
        </div>
        <div className="card stat">
          <div className="label">Total Paid</div>
          <div className="value" style={{ color: 'var(--success)' }}>{fmt(bal.total_paid)} FCFA</div>
        </div>
        <div className="card stat">
          <div className="label">Outstanding</div>
          <div className="value" style={{ color: Number(bal.outstanding) > 0 ? 'var(--warn)' : 'var(--success)' }}>
            {fmt(bal.outstanding)} FCFA
          </div>
        </div>
      </div>

      {Number(bal.outstanding) > 0 && (
        <div className="card" style={{ background: 'linear-gradient(135deg, #1e3a8a, #1e293b)', borderColor: 'var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ margin: 0 }}>Pay your fees online</h2>
              <p style={{ color: 'var(--muted)', margin: '4px 0 0' }}>
                Settle your {fmt(bal.outstanding)} FCFA balance via MTN MoMo or Orange Money.
              </p>
            </div>
            <Link to="/portal/pay"><button>Pay Online →</button></Link>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Payment Progress</h2>
        <div style={{ background: 'var(--panel-2)', borderRadius: 8, height: 22, overflow: 'hidden' }}>
          <div style={{
            width: `${pct}%`,
            height: '100%',
            background: pct >= 100 ? 'var(--success)' : 'var(--primary)',
            transition: 'width .4s ease',
          }} />
        </div>
        <p style={{ color: 'var(--muted)', marginTop: 8 }}>
          {pct}% paid {pct >= 100 ? '· fully settled' : `· ${fmt(bal.outstanding)} FCFA remaining`}
        </p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Recent Payments</h2>
          <Link to="/portal/payments">View all →</Link>
        </div>
        <table>
          <thead>
            <tr><th>Receipt</th><th>Date</th><th>Amount</th><th>Method</th><th></th></tr>
          </thead>
          <tbody>
            {recent.map((p) => (
              <tr key={p.id}>
                <td>{p.receipt_no}</td>
                <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                <td>{fmt(p.amount)}</td>
                <td>{p.method}</td>
                <td><a href={`${api.defaults.baseURL}/portal/payments/${p.id}/receipt/`} target="_blank" rel="noreferrer">Download</a></td>
              </tr>
            ))}
            {!recent.length && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)' }}>No payments yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
