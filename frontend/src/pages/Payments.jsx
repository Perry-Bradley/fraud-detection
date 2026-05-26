import { useEffect, useState } from 'react'
import api from '../api.js'

const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))

export default function Payments() {
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [onlyAnom, setOnlyAnom] = useState(false)

  async function load() {
    const params = { search: q || undefined }
    if (onlyAnom) params.is_anomalous = true
    const r = await api.get('/payments/', { params })
    setRows(r.data.results || r.data)
  }
  useEffect(() => { load() }, [onlyAnom])
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [q])

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Payments</h1>
      <div className="toolbar">
        <input placeholder="Search by receipt, student..." value={q} onChange={(e) => setQ(e.target.value)} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={onlyAnom} onChange={(e) => setOnlyAnom(e.target.checked)} />
          Only anomalies
        </label>
        <button onClick={() => setShowAdd(true)}>+ Record Payment</button>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Receipt</th><th>Date</th><th>Student</th><th>Class</th>
              <th>Amount</th><th>Method</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.receipt_no}</td>
                <td>{new Date(p.payment_date).toLocaleString()}</td>
                <td>{p.student_name}</td>
                <td>{p.student_class}</td>
                <td>{fmt(p.amount)}</td>
                <td>{p.method}</td>
                <td>{p.is_anomalous ? <span className="badge danger">Anomaly {p.anomaly_score}</span> : <span className="badge ok">OK</span>}</td>
                <td><a href={`${api.defaults.baseURL}/payments/${p.id}/receipt/`} target="_blank" rel="noreferrer">Receipt</a></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)' }}>No payments.</td></tr>}
          </tbody>
        </table>
      </div>
      {showAdd && <RecordPaymentModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
    </div>
  )
}

function RecordPaymentModal({ onClose, onSaved }) {
  const [students, setStudents] = useState([])
  const [f, setF] = useState({ student: '', amount: '', method: 'cash', reference: '', notes: '' })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get('/students/', { params: { page_size: 200 } }).then((r) => setStudents(r.data.results || r.data))
  }, [])

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr(null)
    try { await api.post('/payments/', { ...f, amount: Number(f.amount) }); onSaved() }
    catch (ex) { setErr(JSON.stringify(ex.response?.data || ex.message)) }
    finally { setBusy(false) }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Record Payment</h2>
        <form onSubmit={submit}>
          <div className="form-row">
            <label>Student</label>
            <select value={f.student} onChange={(e) => setF({ ...f, student: e.target.value })} required>
              <option value="">-- select --</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.matricule} - {s.full_name} ({s.class_name})</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Amount (FCFA)</label>
            <input type="number" min="1" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required />
          </div>
          <div className="form-row">
            <label>Method</label>
            <select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
          <div className="form-row">
            <label>Reference</label>
            <input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Notes</label>
            <textarea rows="2" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </div>
          {err && <div className="error">{err}</div>}
          <div className="row-actions" style={{ marginTop: 12 }}>
            <button type="submit" disabled={busy}>Record</button>
            <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
