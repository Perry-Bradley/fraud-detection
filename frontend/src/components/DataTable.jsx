import { useMemo, useState } from 'react'

/**
 * Reusable data table with:
 *  - column-level sortable + render fn
 *  - client-side search across stringified rows (or specific keys)
 *  - pagination
 *  - loading skeleton
 *  - empty state
 *
 * Columns: [{ key, label, sortable?, render?(row), align?, width? }]
 */
export default function DataTable({
  rows,
  columns,
  searchKeys = null,
  searchPlaceholder = 'Search...',
  pageSize = 10,
  loading = false,
  emptyTitle = 'No records yet',
  emptySubtitle = 'There is nothing to show here for now.',
  emptyIcon = '∅',
  toolbar = null,
  initialSort = null, // { key, dir: 'asc'|'desc' }
  rowKey = (r) => r.id,
}) {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState(initialSort)

  const filtered = useMemo(() => {
    if (!q) return rows
    const needle = q.toLowerCase()
    return rows.filter((r) => {
      const keys = searchKeys || Object.keys(r)
      return keys.some((k) => String(r[k] ?? '').toLowerCase().includes(needle))
    })
  }, [rows, q, searchKeys])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const { key, dir } = sort
    const factor = dir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const va = a[key], vb = b[key]
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor
      return String(va).localeCompare(String(vb)) * factor
    })
  }, [filtered, sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize)

  function toggleSort(col) {
    if (!col.sortable) return
    setSort((s) => {
      if (!s || s.key !== col.key) return { key: col.key, dir: 'asc' }
      if (s.dir === 'asc') return { key: col.key, dir: 'desc' }
      return null
    })
  }

  return (
    <div>
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input
            placeholder={searchPlaceholder}
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0) }}
          />
        </div>
        <div className="spacer" />
        {toolbar}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={[c.sortable ? 'sortable' : '', sort?.key === c.key ? 'sorted' : ''].join(' ')}
                    style={{ textAlign: c.align || 'left', width: c.width }}
                    onClick={() => toggleSort(c)}
                  >
                    {c.label}
                    {c.sortable && (
                      <span className="sort-icon">
                        {sort?.key === c.key ? (sort.dir === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`} className="skeleton-row">
                  {columns.map((c) => (
                    <td key={c.key}><div className="skeleton" style={{ width: '80%' }} /></td>
                  ))}
                </tr>
              ))}

              {!loading && pageRows.map((row) => (
                <tr key={rowKey(row)}>
                  {columns.map((c) => (
                    <td key={c.key} style={{ textAlign: c.align || 'left' }}>
                      {c.render ? c.render(row) : (row[c.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}

              {!loading && pageRows.length === 0 && (
                <tr>
                  <td colSpan={columns.length}>
                    <div className="empty-state">
                      <div className="icon">{emptyIcon}</div>
                      <h3>{emptyTitle}</h3>
                      <p>{emptySubtitle}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && sorted.length > pageSize && (
          <div className="table-pagination">
            <span>
              Showing <strong>{safePage * pageSize + 1}</strong>–
              <strong>{Math.min((safePage + 1) * pageSize, sorted.length)}</strong>{' '}
              of <strong>{sorted.length}</strong>
            </span>
            <div className="row-actions">
              <button className="ghost small" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>← Prev</button>
              <span>Page {safePage + 1} / {totalPages}</span>
              <button className="ghost small" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
