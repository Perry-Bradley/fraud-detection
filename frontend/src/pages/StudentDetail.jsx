import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api.js'
import { openAuthedFile } from '../utils/files.js'

const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))

export default function StudentDetail() {
  const { id } = useParams()
  const [s, setS] = useState(null)
  const [pays, setPays] = useState([])

  useEffect(() => {
    api.get(`/students/${id}/`).then((r) => setS(r.data))
    api.get(`/students/${id}/payments/`).then((r) => setPays(r.data))
  }, [id])

  if (!s) return <div>Loading...</div>

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{s.full_name}</h1>
      <div className="grid cols-3">
        <div className="card stat"><div className="label">Total Due</div><div className="value">{fmt(s.total_due)}</div></div>
        <div className="card stat"><div className="label">Total Paid</div><div className="value">{fmt(s.total_paid)}</div></div>
        <div className="card stat">
          <div className="label">Outstanding</div>
          <div className="value" style={{ color: Number(s.outstanding) > 0 ? 'var(--warn)' : 'var(--success)' }}>
            {fmt(s.outstanding)}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Payment History</h2>
        <table>
          <thead>
            <tr><th>Receipt</th><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {pays.map((p) => (
              <tr key={p.id}>
                <td>{p.receipt_no}</td>
                <td>{new Date(p.payment_date).toLocaleString()}</td>
                <td>{fmt(p.amount)}</td>
                <td>{p.method}</td>
                <td>{p.reference || '-'}</td>
                <td>{p.is_anomalous ? <span className="badge danger">Anomaly</span> : <span className="badge ok">OK</span>}</td>
                <td><a href="#" onClick={(e) => { e.preventDefault(); openAuthedFile(`/payments/${p.id}/receipt/`) }}>PDF</a></td>
              </tr>
            ))}
            {!pays.length && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)' }}>No payments yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
