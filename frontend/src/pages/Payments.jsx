import { useEffect, useState } from 'react'
import api from '../api.js'
import { openAuthedFile } from '../utils/files.js'
import DataTable from '../components/DataTable.jsx'
import { useToast } from '../context/ToastContext.jsx'

const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))

const METHOD_BADGES = {
  cash: 'ok',
  bank_transfer: 'info',
  mobile_money: 'warn',
  cheque: 'accent',
}

export default function Payments() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [onlyAnom, setOnlyAnom] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const params = { page_size: 500 }
      if (onlyAnom) params.is_anomalous = true
      const r = await api.get('/payments/', { params })
      setRows(r.data.results || r.data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [onlyAnom])

  const columns = [
    { key: 'receipt_no', label: 'Receipt', sortable: true, render: (p) => <code>{p.receipt_no}</code> },
    { key: 'payment_date', label: 'Date', sortable: true, render: (p) => new Date(p.payment_date).toLocaleString() },
    { key: 'student_name', label: 'Student', sortable: true },
    { key: 'student_class', label: 'Class', sortable: true },
    { key: 'amount', label: 'Amount', sortable: true, align: 'right', render: (p) => <strong>{fmt(p.amount)}</strong> },
    {
      key: 'method', label: 'Method',
      render: (p) => <span className={`badge ${METHOD_BADGES[p.method] || 'neutral'}`}>{p.method.replace('_', ' ')}</span>,
    },
    {
      key: 'is_anomalous', label: 'Status',
      render: (p) => p.is_anomalous
        ? <span className="badge danger">⚠ Flagged ({p.anomaly_score})</span>
        : <span className="badge ok">Verified</span>,
    },
    {
      key: '_actions', label: '',
      render: (p) => (
        <a href="#" onClick={(e) => { e.preventDefault(); openAuthedFile(`/payments/${p.id}/receipt/`) }}>
          PDF
        </a>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Payments</h1>
          <div className="subtitle">{rows.length} payment{rows.length === 1 ? '' : 's'} on file · AI fraud detection runs on every record.</div>
        </div>
        <div className="row-actions">
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-2)' }}>
            <input
              type="checkbox" style={{ width: 'auto', margin: 0 }}
              checked={onlyAnom}
              onChange={(e) => setOnlyAnom(e.target.checked)}
            /> Anomalies only
          </label>
          <button onClick={() => setShowAdd(true)}>+ Record Payment</button>
        </div>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        loading={loading}
        searchKeys={['receipt_no', 'student_name', 'student_matricule', 'reference', 'method']}
        searchPlaceholder="Search by receipt, student, reference..."
        emptyIcon="💰"
        emptyTitle="No payments recorded"
        emptySubtitle="Click Record Payment to register the first one."
        initialSort={{ key: 'payment_date', dir: 'desc' }}
      />

      {showAdd && <RecordPaymentModal onClose={() => setShowAdd(false)} onSaved={(p) => {
        setShowAdd(false)
        if (p?.is_anomalous) toast.warn(`Payment saved but flagged as suspicious (score ${p.anomaly_score})`)
        else toast.success('Payment recorded')
        load()
      }} />}
    </div>
  )
}

function RecordPaymentModal({ onClose, onSaved }) {
  const toast = useToast()
  const [students, setStudents] = useState([])
  const [f, setF] = useState({ student: '', amount: '', method: 'cash', reference: '', notes: '' })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get('/students/', { params: { page_size: 500 } }).then((r) => setStudents(r.data.results || r.data))
  }, [])

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr(null)
    try {
      const { data } = await api.post('/payments/', { ...f, amount: Number(f.amount) })
      onSaved(data)
    } catch (ex) {
      const msg = ex.response?.data?.detail || JSON.stringify(ex.response?.data || ex.message)
      setErr(msg); toast.danger('Could not record payment')
    } finally { setBusy(false) }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Record Payment</h2>
        <p style={{ color: 'var(--muted)', marginTop: -8, fontSize: 13 }}>
          The AI fraud detector will score this payment automatically.
        </p>
        <form onSubmit={submit}>
          <div className="form-row">
            <label>Student</label>
            <select value={f.student} onChange={(e) => setF({ ...f, student: e.target.value })} required>
              <option value="">-- select --</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.matricule} — {s.full_name} ({s.class_name})</option>)}
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
          <div className="form-row"><label>Reference (optional)</label><input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></div>
          <div className="form-row"><label>Notes</label><textarea rows="2" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          {err && <div className="error">{err}</div>}
          <div className="row-actions" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="ghost" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Record Payment'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
