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

const SUB_STATUS_BADGE = {
  pending:  'warn',
  approved: 'ok',
  rejected: 'danger',
  flagged:  'accent',
}

export default function Payments() {
  const toast = useToast()
  const [tab, setTab] = useState('payments')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [onlyAnom, setOnlyAnom] = useState(false)

  // Manual submissions state
  const [subs, setSubs] = useState([])
  const [subsLoading, setSubsLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [reviewSub, setReviewSub] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const params = { page_size: 500 }
      if (onlyAnom) params.is_anomalous = true
      const r = await api.get('/payments/', { params })
      setRows(r.data.results || r.data)
    } finally { setLoading(false) }
  }

  async function loadSubs() {
    setSubsLoading(true)
    try {
      const r = await api.get('/manual-submissions/', { params: { page_size: 500 } })
      const data = r.data.results || r.data
      setSubs(data)
      setPendingCount(data.filter((s) => s.status === 'pending').length)
    } finally { setSubsLoading(false) }
  }

  useEffect(() => { load() }, [onlyAnom])
  useEffect(() => { loadSubs() }, [])

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

  const subColumns = [
    { key: 'submitted_at', label: 'Submitted', sortable: true, render: (s) => new Date(s.submitted_at).toLocaleDateString() },
    { key: 'student_name', label: 'Student', sortable: true, render: (s) => <><div>{s.student_name}</div><small style={{ color: 'var(--muted)' }}>{s.student_matricule} · {s.student_class}</small></> },
    { key: 'amount', label: 'Amount', sortable: true, align: 'right', render: (s) => <strong>{fmt(s.amount)}</strong> },
    { key: 'payment_method', label: 'Method', render: (s) => <span className={`badge ${METHOD_BADGES[s.payment_method] || 'neutral'}`}>{s.payment_method.replace('_', ' ')}</span> },
    { key: 'payment_date', label: 'Pay Date', sortable: true },
    {
      key: 'status', label: 'Status',
      render: (s) => <span className={`badge ${SUB_STATUS_BADGE[s.status] || 'neutral'}`}>{s.status}</span>,
    },
    {
      key: 'proof', label: 'Proof',
      render: (s) => s.proof_file_url
        ? <a href={s.proof_file_url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>View</a>
        : '—',
    },
    {
      key: '_actions', label: '',
      render: (s) => (
        <button className="ghost small" onClick={() => setReviewSub(s)}>Review</button>
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
          {tab === 'payments' && (
            <>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-2)' }}>
                <input
                  type="checkbox" style={{ width: 'auto', margin: 0 }}
                  checked={onlyAnom}
                  onChange={(e) => setOnlyAnom(e.target.checked)}
                /> Anomalies only
              </label>
              <button onClick={() => setShowAdd(true)}>+ Record Payment</button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
        {[
          { key: 'payments', label: 'All Payments' },
          { key: 'submissions', label: <>Manual Submissions{pendingCount > 0 && <span className="badge warn" style={{ marginLeft: 6, fontSize: 11 }}>{pendingCount}</span>}</> },
        ].map(({ key, label }) => (
          <button
            key={key}
            className="ghost"
            onClick={() => setTab(key)}
            style={{
              borderRadius: '4px 4px 0 0',
              borderBottom: tab === key ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -2,
              fontWeight: tab === key ? 700 : 400,
              color: tab === key ? 'var(--primary)' : 'var(--muted)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'payments' && (
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
      )}

      {tab === 'submissions' && (
        <DataTable
          rows={subs}
          columns={subColumns}
          loading={subsLoading}
          searchKeys={['student_name', 'student_matricule', 'payment_method', 'status', 'notes']}
          searchPlaceholder="Search by student, method, status..."
          emptyIcon="🧾"
          emptyTitle="No manual submissions"
          emptySubtitle="Students haven't submitted any payment receipts yet."
          initialSort={{ key: 'submitted_at', dir: 'desc' }}
        />
      )}

      {showAdd && <RecordPaymentModal onClose={() => setShowAdd(false)} onSaved={(p) => {
        setShowAdd(false)
        if (p?.is_anomalous) toast.warn(`Payment saved but flagged as suspicious (score ${p.anomaly_score})`)
        else toast.success('Payment recorded')
        load()
      }} />}

      {reviewSub && (
        <ReviewSubmissionModal
          sub={reviewSub}
          onClose={() => setReviewSub(null)}
          onSaved={() => { setReviewSub(null); loadSubs(); load() }}
        />
      )}
    </div>
  )
}

function ReviewSubmissionModal({ sub, onClose, onSaved }) {
  const toast = useToast()
  const [note, setNote] = useState(sub.review_note || '')
  const [busy, setBusy] = useState(false)

  async function act(action) {
    setBusy(true)
    try {
      await api.post(`/manual-submissions/${sub.id}/${action}/`, { note })
      toast.success(action === 'approve' ? 'Payment approved and recorded' : action === 'reject' ? 'Submission rejected' : 'Submission flagged')
      onSaved()
    } catch (ex) {
      toast.danger(ex.response?.data?.detail || `Could not ${action} submission`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Review Submission</h2>

        {/* Student + details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Student</div>
            <div style={{ fontWeight: 600 }}>{sub.student_name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{sub.student_matricule} · {sub.student_class}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Amount</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{fmt(sub.amount)} <span style={{ fontSize: 12, fontWeight: 400 }}>FCFA</span></div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Method</div>
            <div>{sub.payment_method.replace('_', ' ')}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Payment Date</div>
            <div>{sub.payment_date}</div>
          </div>
        </div>

        {sub.notes && (
          <div style={{ padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 6, fontSize: 13, marginBottom: 12 }}>
            <strong>Student note:</strong> {sub.notes}
          </div>
        )}

        {sub.proof_file_url && (
          <div style={{ marginBottom: 16 }}>
            <a href={sub.proof_file_url} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
              📎 View Proof of Payment
            </a>
          </div>
        )}

        <div className="form-row">
          <label>Admin Note (optional)</label>
          <textarea
            rows="2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason for rejection, confirmation details, etc."
          />
        </div>

        <div className="row-actions" style={{ marginTop: 16, justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          {sub.status !== 'approved' && (
            <>
              <button
                type="button"
                style={{ background: 'var(--warn-bg, #fef3c7)', color: '#92400e', border: '1px solid #fbbf24' }}
                disabled={busy}
                onClick={() => act('flag')}
              >
                {busy ? '...' : 'Flag'}
              </button>
              <button
                type="button"
                style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' }}
                disabled={busy}
                onClick={() => act('reject')}
              >
                {busy ? '...' : 'Reject'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => act('approve')}
              >
                {busy ? 'Approving...' : '✓ Approve & Record Payment'}
              </button>
            </>
          )}
          {sub.status === 'approved' && (
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>Already approved</span>
          )}
        </div>
      </div>
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
