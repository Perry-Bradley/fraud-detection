import { useEffect, useState } from 'react'
import api from '../api.js'
import DataTable from '../components/DataTable.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))

const TERM_LABELS = {
  term_1: 'Term 1',
  term_2: 'Term 2',
  term_3: 'Term 3',
  annual: 'Annual'
}

export default function FeeStructures() {
  const { user } = useAuth()
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const isAdmin = user?.role === 'admin'

  async function load() {
    setLoading(true)
    try {
      const r = await api.get('/fee-structures/', { params: { page_size: 500 } })
      setRows(r.data.results || r.data)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const columns = [
    { key: 'class_name', label: 'Class', sortable: true },
    { key: 'term', label: 'Term', sortable: true, render: (r) => TERM_LABELS[r.term] || r.term },
    { key: 'academic_year', label: 'Academic Year', sortable: true },
    { key: 'amount', label: 'Amount', sortable: true, align: 'right', render: (r) => <span style={{ color: 'var(--brand)' }}>{fmt(r.amount)} FCFA</span> },
    { key: 'description', label: 'Description' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Fee Structures</h1>
          <div className="subtitle">{rows.length} fee rules configured.</div>
        </div>
        {isAdmin && (
          <div className="row-actions">
            <button onClick={() => setShowAdd(true)}>+ Add Fee Structure</button>
          </div>
        )}
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        loading={loading}
        searchKeys={['class_name', 'academic_year', 'term']}
        searchPlaceholder="Search by class, year, term..."
        emptyIcon="🏷️"
        emptyTitle="No fee structures yet"
        emptySubtitle={isAdmin ? "Use the Add Fee Structure button to configure expected fees." : "Admins can configure fees here."}
        initialSort={{ key: 'academic_year', dir: 'desc' }}
      />

      {showAdd && <AddFeeModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); toast.success('Fee structure added'); load() }} />}
    </div>
  )
}

function AddFeeModal({ onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState({ class_name: 'Form 1', term: 'term_1', academic_year: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1), amount: '', description: '' })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr(null)
    try { 
      await api.post('/fee-structures/', f); 
      onSaved() 
    }
    catch (ex) {
      const msg = ex.response?.data?.detail || JSON.stringify(ex.response?.data || ex.message)
      setErr(msg); toast.danger('Could not save fee structure')
    }
    finally { setBusy(false) }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Add Fee Structure</h2>
        <form onSubmit={submit}>
          <div className="form-row">
            <label>Class</label>
            <select value={f.class_name} onChange={(e) => setF({ ...f, class_name: e.target.value })}>
              {['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Lower Sixth', 'Upper Sixth'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Term</label>
            <select value={f.term} onChange={(e) => setF({ ...f, term: e.target.value })}>
              {Object.entries(TERM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Academic Year</label>
            <input value={f.academic_year} onChange={(e) => setF({ ...f, academic_year: e.target.value })} placeholder="e.g. 2024/2025" required />
          </div>
          <div className="form-row">
            <label>Amount (FCFA)</label>
            <input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required min="0" />
          </div>
          <div className="form-row">
            <label>Description (Optional)</label>
            <input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          {err && <div className="error">{err}</div>}
          <div className="row-actions" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="ghost" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save Fee Structure'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
