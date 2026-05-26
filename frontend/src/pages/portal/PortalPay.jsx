import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api.js'

const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))

export default function PortalPay() {
  const nav = useNavigate()
  const [bal, setBal] = useState(null)
  const [amount, setAmount] = useState('')
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

  // After intent created -> show status panel instead of form
  if (intent) {
    return (
      <div>
        <h1 style={{ marginTop: 0 }}>Payment in Progress</h1>
        <div className="card">
          <h2>Status: {' '}
            <span className={`badge ${intent.status === 'successful' ? 'ok' : intent.status === 'failed' ? 'danger' : 'warn'}`}>
              {intent.status.toUpperCase()}
            </span>
          </h2>

          {intent.status === 'pending' && (
            <>
              <p>
                {intent._initial?.is_stub ? (
                  <>
                    <strong>Stub mode</strong> — no Campay API key is configured. Ask the school admin to{' '}
                    <em>simulate</em> the callback from the staff dashboard to complete this demo payment.
                  </>
                ) : (
                  <>
                    Check the phone <strong>{intent.phone}</strong> for a USSD prompt and approve the charge of{' '}
                    <strong>{fmt(intent.amount)} FCFA</strong>.
                    {intent.ussd_code && <> If nothing arrives, dial <code>{intent.ussd_code}</code>.</>}
                  </>
                )}
              </p>
              <p style={{ color: 'var(--muted)' }}>This page polls every few seconds.</p>
            </>
          )}

          {intent.status === 'successful' && (
            <>
              <p style={{ color: 'var(--success)' }}>
                Payment received! Receipt {' '}
                <strong>{intent.payment_receipt_no}</strong> has been issued.
              </p>
              <button onClick={() => nav('/portal/payments')}>View My Payments</button>
            </>
          )}

          {intent.status === 'failed' && (
            <>
              <p style={{ color: 'var(--danger)' }}>
                Payment failed{intent.failure_reason ? `: ${intent.failure_reason}` : '.'}
              </p>
              <button onClick={() => setIntent(null)}>Try Again</button>
            </>
          )}

          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
            <div>Reference: <code>{intent.campay_reference || '—'}</code></div>
            <div>Operator: {intent.operator || '—'}</div>
            <div>Intent ID: <code>{intent.id}</code></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Pay Online</h1>

      <div className="grid cols-3">
        <div className="card stat"><div className="label">Total Due</div><div className="value">{fmt(bal.total_due)} FCFA</div></div>
        <div className="card stat"><div className="label">Total Paid</div><div className="value" style={{ color: 'var(--success)' }}>{fmt(bal.total_paid)} FCFA</div></div>
        <div className="card stat">
          <div className="label">Outstanding</div>
          <div className="value" style={{ color: bal.outstanding > 0 ? 'var(--warn)' : 'var(--success)' }}>
            {fmt(bal.outstanding)} FCFA
          </div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 500 }}>
        <h2>Pay with Mobile Money</h2>
        <p style={{ color: 'var(--muted)', marginTop: -4 }}>
          Powered by Campay. Supports MTN MoMo and Orange Money.
        </p>
        <form onSubmit={submit}>
          <div className="form-row">
            <label>Amount (FCFA)</label>
            <input
              type="number"
              min="100"
              step="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label>Mobile Money Phone</label>
            <input
              type="tel"
              placeholder="6XXXXXXXX or 2376XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          {err && <div className="error">{err}</div>}
          <button type="submit" disabled={busy} style={{ width: '100%', marginTop: 8 }}>
            {busy ? 'Initiating...' : `Pay ${amount ? fmt(amount) + ' FCFA' : ''}`}
          </button>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 12 }}>
            You will receive a USSD prompt on your phone to confirm the payment.
            Your balance updates automatically once the operator confirms.
          </p>
        </form>
      </div>
    </div>
  )
}
