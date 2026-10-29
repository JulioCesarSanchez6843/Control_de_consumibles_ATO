import { useEffect, useState } from 'react'
import { api } from '../api'

const NUEVO = { modelo: '', descripcion: '', marca: '', stock: 0, stock_minimo: 1 }

export default function ConsumibleModal({ onClose, onCreated }) {
  const [f, setF] = useState(NUEVO)
  const [err, setErr] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onClose])

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const crear = async (e) => {
    e.preventDefault()
    setErr('')
    setEnviando(true)
    try {
      await api.addConsumable({
        ...f,
        stock: Number(f.stock),
        stock_minimo: Number(f.stock_minimo),
      })
      onCreated()
    } catch (ex) {
      setErr(ex.message)
      setEnviando(false)
    }
  }

  return (
    <div className="modal-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form className="modal" onSubmit={crear} role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
        <div className="modal-cabecera">
          <h2 id="modal-titulo">Nuevo consumible</h2>
          <button type="button" className="modal-cerrar" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <label>Modelo
          <input value={f.modelo} onChange={set('modelo')} required autoFocus
            placeholder="Ej. TN850" autoComplete="off" />
        </label>
        <div className="fila-2">
          <label>Descripción
            <input value={f.descripcion} onChange={set('descripcion')}
              placeholder="Toner, Tinta…" autoComplete="off" />
          </label>
          <label>Marca
            <input value={f.marca} onChange={set('marca')} autoComplete="off" />
          </label>
        </div>
        <div className="fila-2">
          <label>Stock inicial
            <input type="number" min="0" value={f.stock} onChange={set('stock')} />
          </label>
          <label>Stock mínimo
            <input type="number" min="0" value={f.stock_minimo} onChange={set('stock_minimo')} />
          </label>
        </div>
        <p className="hint">Se marca como "Bajo" cuando el stock llega al mínimo.</p>

        {err && <div role="alert" className="alert error">{err}</div>}

        <div className="modal-acciones">
          <button type="button" className="btn secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Agregar consumible'}
          </button>
        </div>
      </form>
    </div>
  )
}