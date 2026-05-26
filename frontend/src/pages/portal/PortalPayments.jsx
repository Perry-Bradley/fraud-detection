import { useEffect, useState } from 'react'
import api from '../../api.js'

const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))

export default function PortalPayments() {
  const [pays, setPays] = useState([])
  const [loading, setLoading] = useState(true)

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

  if (loading) return <div>Loading...</div>

  const total = pays.reduce((acc, p) => acc + Number(p.amount), 0)

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>My Payments</h1>
      <div className="toolbar">
        <span style={{ color: 'var(--muted)' }}>
          {pays.length} payment{pays.length === 1 ? '' : 's'} · Total paid: <strong style={{ color: 'var(--text)' }}>{fmt(total)} FCFA</strong>
        </span>
        <button onClick={exportCsv} disabled={!pays.length}>Export CSV</button>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Receipt</th><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {pays.map((p) => (
              <tr key={p.id}>
                <td>{p.receipt_no}</td>
                <td>{new Date(p.payment_date).toLocaleString()}</td>
                <td>{fmt(p.amount)}</td>
                <td>{p.method}</td>
                <td>{p.reference || '-'}</td>
                <td><a href={`${api.defaults.baseURL}/portal/payments/${p.id}/receipt/`} target="_blank" rel="noreferrer">Download PDF</a></td>
              </tr>
            ))}
            {!pays.length && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)' }}>No payments yet — contact the bursary if you've paid.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
