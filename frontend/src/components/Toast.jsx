import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { Check, TriangleAlert, X } from 'lucide-react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const seq = useRef(0)

  const quitar = useCallback((id) => {
    setItems((lista) => lista.filter((t) => t.id !== id))
  }, [])

  const mostrar = useCallback((tipo, texto) => {
    const id = ++seq.current
    setItems((lista) => [...lista, { id, tipo, texto }])
    setTimeout(() => quitar(id), 4500)
  }, [quitar])

  const api = useMemo(() => ({
    ok: (texto) => mostrar('ok', texto),
    error: (texto) => mostrar('error', texto),
  }), [mostrar])

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={'toast ' + t.tipo}>
            {t.tipo === 'ok' ? <Check size={20} /> : <TriangleAlert size={20} />}
            <span>{t.texto}</span>
            <button type="button" className="toast-x" onClick={() => quitar(t.id)} aria-label="Cerrar">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}