import { useEffect, useState } from 'react'
import api from '../api.js'
import DataTable from '../components/DataTable.jsx'

const ACTION_BADGES = {
  PAYMENT_CREATED: 'ok',
  PAYMENT_CREATED_ONLINE: 'info',
  ANOMALY_DETECTED: 'danger',
  LOGIN: 'neutral',
}

export default function AuditLogPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const r = await api.get('/audit-logs/', { params: { page_size: 500 } })
      setRows(r.data.results || r.data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const columns = [
    { key: 'timestamp', label: 'Time', sortable: true, render: (a) => new Date(a.timestamp).toLocaleString() },
    {
      key: 'action', label: 'Action', sortable: true,
      render: (a) => <span className={`badge ${ACTION_BADGES[a.action] || 'neutral'}`}>{a.action.replaceAll('_', ' ')}</span>,
    },
    { key: 'table_name', label: 'Table', sortable: true },
    { key: 'record_id', label: 'Record', render: (a) => <code style={{ fontSize: 11 }}>{a.record_id?.slice(0, 8) || '—'}</code> },
    { key: 'changed_by_name', label: 'User', sortable: true, render: (a) => a.changed_by_name || 'system' },
    {
      key: 'new_value', label: 'Details',
      render: (a) => (
        <code style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 280, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {JSON.stringify(a.new_value) || '—'}
        </code>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Audit Log</h1>
          <div className="subtitle">{rows.length} event{rows.length === 1 ? '' : 's'} on file · immutable record of every state change.</div>
        </div>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        loading={loading}
        searchKeys={['action', 'table_name', 'record_id', 'changed_by_name']}
        searchPlaceholder="Search action, table, user..."
        emptyIcon="📋"
        emptyTitle="No audit entries"
        emptySubtitle="Audit events appear here as users interact with the system."
        initialSort={{ key: 'timestamp', dir: 'desc' }}
        pageSize={20}
      />
    </div>
  )
}
