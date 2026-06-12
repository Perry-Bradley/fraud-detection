import { useEffect, useRef, useState } from 'react'
import api from '../../api.js'

const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))

const STATUS_BADGE = {
  pending:  { cls: 'warn',    label: 'Pending Review' },
  approved: { cls: 'ok',      label: 'Approved' },
  rejected: { cls: 'danger',  label: 'Rejected' },
  flagged:  { cls: 'accent',  label: 'Flagged' },
}

export default function PortalManualPayment() {
  const [bal, setBal] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loadingSubs, setLoadingSubs] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    api.get('/portal/balance/').then((r) => setBal(r.data))
    loadSubmissions()
  }, [])

  async function loadSubmissions() {
    setLoadingSubs(true)
    try {
      const r = await api.get('/portal/manual-payments/list/')
      setSubmissions(r.data)
    } finally {
      setLoadingSubs(false)
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Manual Payment</h1>
      <p style={{ color: 'var(--muted)', marginTop: -4 }}>
        Already paid via bank or cash? Upload your receipt and the bursary will verify and record it.
      </p>

      {/* Balance summary */}
      {bal && (
        <div className="grid cols-3" style={{ marginBottom: 20 }}>
          <div className="card stat">
            <div className="label">Total Fees</div>
            <div className="value">{fmt(bal.total_due)}</div>
          </div>
          <div className="card stat">
            <div className="label">Paid</div>
            <div className="value" style={{ color: 'var(--success)' }}>{fmt(bal.total_paid)}</div>
          </div>
          <div className="card stat">
            <div className="label">Outstanding</div>
            <div className="value" style={{ color: bal.outstanding > 0 ? 'var(--warn)' : 'var(--success)' }}>
              {fmt(bal.outstanding)}
            </div>
          </div>
        </div>
      )}

      {/* Submit button */}
      {!showForm && (
        <div className="card" style={{ maxWidth: 520, marginBottom: 24 }}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Submit a payment receipt</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0 }}>
            Fill in the amount you paid, the date, how you paid, and attach a photo or scan of your receipt.
            The bursary team will review and approve it — usually within 24 hours.
          </p>
          <button onClick={() => setShowForm(true)} style={{ width: '100%', padding: 12 }}>
            + Submit New Receipt
          </button>
        </div>
      )}

      {showForm && (
        <SubmitForm
          onCancel={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadSubmissions() }}
        />
      )}

      {/* Previous submissions */}
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>My Submissions</h2>
      {loadingSubs ? (
        <p style={{ color: 'var(--muted)' }}>Loading...</p>
      ) : submissions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🧾</div>
          <div>No submissions yet.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {submissions.map((s) => (
            <SubmissionCard key={s.id} sub={s} />
          ))}
        </div>
      )}
    </div>
  )
}

function SubmitForm({ onCancel, onSaved }) {
  const fileRef = useRef(null)
  const [f, setF] = useState({
    amount: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().slice(0, 10),
    notes: '',
  })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [success, setSuccess] = useState(null)

  function handleFile(e) {
    const chosen = e.target.files[0]
    if (!chosen) return
    setFile(chosen)
    if (chosen.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(chosen))
    } else {
      setPreview(null)
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (!file) { setErr('Please attach a proof of payment file.'); return }
    const amt = Number(f.amount)
    if (!amt || amt < 10) { setErr('Amount must be at least 10 FCFA.'); return }

    setBusy(true); setErr(null)
    try {
      const fd = new FormData()
      fd.append('amount', f.amount)
      fd.append('payment_method', f.payment_method)
      fd.append('payment_date', f.payment_date)
      fd.append('notes', f.notes)
      fd.append('proof_file', file)
      const { data } = await api.post('/portal/manual-payments/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSuccess(data)
    } catch (ex) {
      setErr(ex.response?.data?.detail || JSON.stringify(ex.response?.data || ex.message))
    } finally {
      setBusy(false)
    }
  }

  if (success) {
    return (
      <div className="card" style={{ maxWidth: 520, marginBottom: 24, textAlign: 'center', padding: '28px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
        <h2 style={{ margin: 0, color: '#14532d' }}>Receipt Submitted!</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Your receipt for <strong>{fmt(success.amount)} FCFA</strong> is now pending review.<br />
          You'll be notified once the bursary approves it.
        </p>
        <button onClick={onSaved} style={{ marginTop: 8 }}>Done</button>
      </div>
    )
  }

  return (
    <div className="card" style={{ maxWidth: 520, marginBottom: 24 }}>
      <h2 style={{ marginTop: 0 }}>Submit Payment Receipt</h2>
      <form onSubmit={submit}>
        <div className="form-row">
          <label>Amount Paid (FCFA)</label>
          <input
            type="number"
            min="10"
            step="1"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
            required
            placeholder="e.g. 25000"
            style={{ fontSize: 18, fontWeight: 600 }}
          />
        </div>

        <div className="form-row">
          <label>Payment Method</label>
          <select value={f.payment_method} onChange={(e) => setF({ ...f, payment_method: e.target.value })}>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>

        <div className="form-row">
          <label>Date of Payment</label>
          <input
            type="date"
            value={f.payment_date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setF({ ...f, payment_date: e.target.value })}
            required
          />
        </div>

        <div className="form-row">
          <label>Proof of Payment <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
            onChange={handleFile}
            style={{ padding: '6px 0' }}
          />
          {file && (
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
          {preview && (
            <img
              src={preview}
              alt="Receipt preview"
              style={{ marginTop: 8, maxWidth: '100%', maxHeight: 200, borderRadius: 6, border: '1px solid var(--border)' }}
            />
          )}
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            JPEG, PNG, WebP, GIF or PDF · max 10 MB
          </p>
        </div>

        <div className="form-row">
          <label>Additional Notes (optional)</label>
          <textarea
            rows="2"
            value={f.notes}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
            placeholder="e.g. reference number, bank branch..."
          />
        </div>

        {err && <div className="error">{err}</div>}

        <div className="row-actions" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" disabled={busy} style={{ padding: '10px 20px' }}>
            {busy ? 'Uploading...' : 'Submit Receipt'}
          </button>
        </div>
      </form>
    </div>
  )
}

function SubmissionCard({ sub }) {
  const badge = STATUS_BADGE[sub.status] || { cls: 'neutral', label: sub.status }
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{fmt(sub.amount)} FCFA</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {sub.payment_method.replace('_', ' ')} · {sub.payment_date} · Submitted {new Date(sub.submitted_at).toLocaleDateString()}
          </div>
        </div>
        <span className={`badge ${badge.cls}`}>{badge.label}</span>
      </div>

      {sub.notes && (
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0 0' }}>{sub.notes}</p>
      )}

      {sub.review_note && (
        <div style={{
          marginTop: 8, padding: '8px 10px', borderRadius: 6,
          background: sub.status === 'rejected' ? '#fef2f2' : sub.status === 'flagged' ? '#fef9c3' : '#f0fdf4',
          fontSize: 12,
        }}>
          <strong>Admin note:</strong> {sub.review_note}
        </div>
      )}

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
        {sub.proof_file_url && (
          <a href={sub.proof_file_url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
            View Receipt
          </a>
        )}
        {sub.payment && (
          <span style={{ fontSize: 12, color: 'var(--success)' }}>
            Receipt issued: <strong>{sub.payment}</strong>
          </span>
        )}
      </div>
    </div>
  )
}
