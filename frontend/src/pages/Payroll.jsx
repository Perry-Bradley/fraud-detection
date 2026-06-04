import { useEffect, useState } from 'react'
import api from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))
const STATUS_BADGE = { successful: 'ok', pending: 'warn', failed: 'danger' }

export default function Payroll() {
  const { user } = useAuth()
  const toast = useToast()
  const isAdmin = user?.role === 'admin'
  const [staff, setStaff] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState(null)   // staff being paid

  async function load() {
    setLoading(true)
    try {
      const [s, h] = await Promise.all([
        api.get('/staff/', { params: { page_size: 300, is_active: true } }),
        api.get('/salary-payments/', { params: { page_size: 100 } }),
      ])
      setStaff(s.data.results || s.data)
      setHistory(h.data.results || h.data)
    } finally { setLoading(false) }
  }
  useEffect(() => {
    load()
    const t = setInterval(() => {
      // keep the history fresh so pending payouts flip to successful live
      api.get('/salary-payments/', { params: { page_size: 100 } })
        .then((r) => setHistory(r.data.results || r.data)).catch(() => {})
    }, 20000)
    return () => clearInterval(t)
  }, [])

  const totalPaid = history.filter((h) => h.status === 'successful').reduce((a, h) => a + Number(h.amount), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Payroll</h1>
          <div className="subtitle">Disburse staff salaries via mobile money. {history.length} payout(s) on record.</div>
        </div>
      </div>

      <div className="grid cols-3">
        <div className="card stat"><div className="label">Active Staff</div><div className="value">{staff.length}</div></div>
        <div className="card stat"><div className="label">Total Disbursed</div><div className="value" style={{ color: 'var(--success)' }}>{fmt(totalPaid)}</div><div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>FCFA</div></div>
        <div className="card stat"><div className="label">Pending</div><div className="value" style={{ color: 'var(--warn)' }}>{history.filter((h) => h.status === 'pending').length}</div></div>
      </div>

      {/* Staff list with Pay action */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <h2 style={{ marginTop: 0 }}>Staff</h2>
        {loading ? <div>Loading…</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Staff ID</th><th style={th}>Name</th><th style={th}>Designation</th>
              <th style={{ ...th, textAlign: 'right' }}>Salary</th><th style={th}>Phone</th><th style={th}></th>
            </tr></thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td style={td}><code>{s.staff_id}</code></td>
                  <td style={td}>{s.full_name}</td>
                  <td style={td}>{s.designation || '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{s.salary ? fmt(s.salary) : '—'}</td>
                  <td style={td}>{s.phone || <span style={{ color: 'var(--danger)' }}>no phone</span>}</td>
                  <td style={td}>
                    {isAdmin && <button className="small" disabled={!s.phone} onClick={() => setTarget(s)}>Pay salary</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* History */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <h2 style={{ marginTop: 0 }}>Disbursement History</h2>
        {history.length === 0 ? (
          <div style={{ color: 'var(--muted)', padding: 16, textAlign: 'center' }}>No salary payments yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Date</th><th style={th}>Staff</th><th style={th}>Period</th>
              <th style={{ ...th, textAlign: 'right' }}>Amount</th><th style={th}>Status</th><th style={th}>Reference</th>
            </tr></thead>
            <tbody>
              {history.map((p) => (
                <tr key={p.id}>
                  <td style={td}>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td style={td}>{p.staff_name}</td>
                  <td style={td}>{p.period || '—'}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmt(p.amount)}</td>
                  <td style={td}>
                    <span className={`badge ${STATUS_BADGE[p.status] || 'neutral'}`}>{p.status_display}</span>
                    {p.is_stub && <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6 }}>stub</span>}
                  </td>
                  <td style={td}><code style={{ fontSize: 11 }}>{p.reference || '—'}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {target && (
        <PayModal staff={target} onClose={() => setTarget(null)}
          onPaid={() => { setTarget(null); load() }} />
      )}
    </div>
  )
}

function PayModal({ staff, onClose, onPaid }) {
  const toast = useToast()
  const [amount, setAmount] = useState(staff.salary ? String(Math.round(staff.salary)) : '')
  const [period, setPeriod] = useState('')
  const [phone, setPhone] = useState(staff.phone || '')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault(); setBusy(true)
    try {
      const { data } = await api.post('/salary-payments/disburse/', {
        staff: staff.id, amount: Number(amount), period, phone,
      })
      if (data.status === 'failed') toast.danger(data.failure_reason || 'Payout failed')
      else toast.success(`Salary sent to ${staff.full_name} (${data.status})`)
      onPaid()
    } catch (ex) {
      toast.danger(ex.response?.data?.detail || 'Could not disburse')
      setBusy(false)
    }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Pay salary — {staff.full_name}</h2>
        <p style={{ color: 'var(--muted)', marginTop: -8, fontSize: 13 }}>
          Sends a mobile-money payout to the staff member's number.
        </p>
        <form onSubmit={submit}>
          <div className="form-row"><label>Amount (FCFA)</label>
            <input type="number" min="100" value={amount} onChange={(e) => setAmount(e.target.value)} required style={{ fontSize: 18, fontWeight: 600 }} />
          </div>
          <div className="form-row"><label>Period</label>
            <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="e.g. June 2026" />
          </div>
          <div className="form-row"><label>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="6XXXXXXXX" required />
          </div>
          <div className="row-actions" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="ghost" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={busy}>{busy ? 'Sending…' : `Send ${amount ? fmt(amount) + ' FCFA' : ''}`}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const th = { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid var(--border)', fontSize: 12 }
const td = { padding: '7px 10px', borderBottom: '1px solid var(--border)' }
