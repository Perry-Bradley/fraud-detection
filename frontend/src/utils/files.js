import api from '../api.js'

/**
 * Open a protected file (e.g. a PDF receipt) in a new tab.
 *
 * A plain <a href="/api/.../receipt/"> can't work: a raw browser navigation
 * carries no Authorization header, so the API returns 401. Instead we fetch the
 * file THROUGH axios (which attaches the JWT Bearer token and refreshes it on
 * 401), then hand the blob to the already-open tab.
 *
 * The blank tab is opened synchronously inside the click handler so popup
 * blockers don't kill it; we only set its location once the blob is ready.
 *
 * @param {string} path  API path relative to the axios baseURL, e.g.
 *                       `/payments/<id>/receipt/`
 */
export async function openAuthedFile(path) {
  const win = window.open('', '_blank')
  try {
    const res = await api.get(path, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    if (win) {
      win.location = url
    } else {
      // Popup blocked — fall back to a direct download.
      const a = document.createElement('a')
      a.href = url
      a.download = path.split('/').filter(Boolean).slice(-2, -1)[0] + '.pdf'
      a.click()
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch (e) {
    if (win) win.close()
    alert('Could not open the document. Please sign in again if this keeps happening.')
  }
}
