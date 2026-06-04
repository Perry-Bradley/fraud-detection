import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api.js'

const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))

export default function PortalPay() {
  const nav = useNavigate()
  const [bal, setBal] = useState(null)
  const [amount, setAmount] = useState('')
  const [operator, setOperator] = useState('mtn')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [intent, setIntent] = useState(null)
  const pollRef = useRef(null)

  useEffect(() => {
    api.get('/portal/balance/').then((r) => {
      setBal(r.data)
      if (r.data.outstanding > 0) setAmount(String(Math.round(r.data.outstanding)))
    })
    return () => clearInterval(pollRef.current)
  }, [])

  useEffect(() => {
    if (!intent || intent.status !== 'pending') return
    pollRef.current = setInterval(async () => {
      try {
        const r = await api.get(`/portal/intents/${intent.id}/`)
        setIntent(r.data)
        if (r.data.status !== 'pending') clearInterval(pollRef.current)
      } catch (_) { /* ignore transient errors */ }
    }, 3000)
    return () => clearInterval(pollRef.current)
  }, [intent?.id, intent?.status])

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      const { data } = await api.post('/portal/pay/', { amount: Number(amount), phone })
      const r = await api.get(`/portal/intents/${data.intent_id}/`)
      setIntent({ ...r.data, _initial: data })
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Could not initiate payment.')
    } finally {
      setBusy(false)
    }
  }

  if (!bal) return <div>Loading...</div>

  // POST-SUBMIT STATUS PANEL
  if (intent) {
    return (
      <div>
        <h1 style={{ marginTop: 0, marginBottom: 6 }}>Payment in Progress</h1>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          {intent.status === 'pending'
            ? 'Approve the prompt on your phone to complete this transaction.'
            : intent.status === 'successful' ? 'Your payment has been received and recorded.'
            : 'There was a problem processing this payment.'}
        </p>

        {/* Big status hero */}
        <div className="card" style={{
          background: intent.status === 'successful' ? 'linear-gradient(135deg, #dcfce7, #f0fdf4)'
            : intent.status === 'failed' ? 'linear-gradient(135deg, #fee2e2, #fef2f2)'
            : 'linear-gradient(135deg, #fef3c7, #fffbeb)',
          border: 'none',
          textAlign: 'center',
          padding: '32px 20px',
        }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>
            {intent.status === 'successful' ? '✅' : intent.status === 'failed' ? '❌' : '⏳'}
          </div>
          <h2 style={{
            margin: 0,
            fontSize: 22,
            color: intent.status === 'successful' ? '#14532d'
              : intent.status === 'failed' ? '#7f1d1d' : '#78350f',
          }}>
            {intent.status === 'pending' && <><span className="status-pulse" style={{ marginRight: 8 }} /> Waiting for confirmation</>}
            {intent.status === 'successful' && 'Payment Received'}
            {intent.status === 'failed' && 'Payment Failed'}
          </h2>
          <div style={{ marginTop: 12, fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>
            {fmt(intent.amount)} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>FCFA</span>
          </div>
        </div>

        {/* Details */}
        <div className="card">
          {intent.status === 'pending' && (
            <>
              {intent._initial?.is_stub ? (
                <p>
                  <strong>⚙️ Stub mode</strong> — no Campay API key configured.<br />
                  Ask an admin to simulate the callback from the staff dashboard to complete this demo.
                </p>
              ) : (
                <p>
                  📱 Check the phone <strong>{intent.phone}</strong> for a USSD prompt.{' '}
                  {intent.ussd_code && <>If nothing arrives, dial <code>{intent.ussd_code}</code>.</>}
                </p>
              )}
              <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 0 }}>
                Auto-refreshing every 3 seconds...
              </p>
            </>
          )}

          {intent.status === 'successful' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Receipt issued</div>
                <code style={{ fontSize: 14 }}>{intent.payment_receipt_no}</code>
              </div>
              <button onClick={() => nav('/portal/payments')}>View My Payments →</button>
            </div>
          )}

          {intent.status === 'failed' && (
            <div>
              <p style={{ color: 'var(--danger)' }}>
                {intent.failure_reason || 'The transaction was cancelled or could not be completed.'}
              </p>
              <button onClick={() => setIntent(null)}>Try Again</button>
            </div>
          )}

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)' }}>
            <div>Reference: <code>{intent.campay_reference || '—'}</code></div>
            <div>Operator: {intent.operator || '—'}</div>
            <div>Intent: <code>{intent.id}</code></div>
          </div>
        </div>
      </div>
    )
  }

  // PRE-SUBMIT FORM
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Pay Online</h1>
      <p style={{ color: 'var(--muted)', marginTop: -4 }}>
        Pay your school fees securely from your phone via mobile money.
      </p>

      {/* Balance summary */}
      <div className="grid cols-3">
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

      {/* Payment form */}
      <div className="card" style={{ maxWidth: 520 }}>
        <h2 style={{ marginTop: 0 }}>Mobile Money Payment</h2>
        <form onSubmit={submit}>
          {/* Operator picker */}
          <label style={{ marginBottom: 8 }}>Choose your operator</label>
          <div className="operator-picker">
            <div
              className={`operator-card ${operator === 'mtn' ? 'selected' : ''}`}
              onClick={() => setOperator('mtn')}
            >
              <div className="op-name">📱 MTN MoMo</div>
              <div className="op-desc">67·68·65·670–679</div>
            </div>
            <div
              className={`operator-card ${operator === 'orange' ? 'selected' : ''}`}
              onClick={() => setOperator('orange')}
            >
              <div className="op-name">🟠 Orange Money</div>
              <div className="op-desc">69·655–659·686–689</div>
            </div>
          </div>

          <div className="form-row">
            <label>Amount (FCFA)</label>
            <input
              type="number"
              min="100"
              step="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="0"
              style={{ fontSize: 18, fontWeight: 600 }}
            />
          </div>

          <div className="form-row">
            <label>{operator === 'mtn' ? 'MTN MoMo' : 'Orange Money'} phone number</label>
            <input
              type="tel"
              placeholder="6XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              inputMode="numeric"
            />
            <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
              You'll receive a USSD prompt on this number.
            </p>
          </div>

          {err && <div className="error">{err}</div>}

          <button type="submit" disabled={busy} style={{ width: '100%', marginTop: 8, padding: 12, fontSize: 14 }}>
            {busy ? 'Initiating...' : `Pay ${amount ? fmt(amount) + ' FCFA' : ''}`}
          </button>

          <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 12, textAlign: 'center' }}>
            Powered by Campay · Your balance updates automatically once the operator confirms.
          </p>
        </form>
      </div>
    </div>
  )
}
