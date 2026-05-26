import { createContext, useCallback, useContext, useState } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((ts) => ts.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((message, kind = 'info', ttl = 4000) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((ts) => [...ts, { id, message, kind }])
    setTimeout(() => remove(id), ttl)
  }, [remove])

  const api = {
    info: (m) => push(m, 'info'),
    success: (m) => push(m, 'success'),
    warn: (m) => push(m, 'warn'),
    danger: (m) => push(m, 'danger'),
  }

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`} onClick={() => remove(t.id)}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
