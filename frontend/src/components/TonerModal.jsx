import { useEffect, useState } from 'react'
import { api } from '../api'

export default function TonerModal({ onClose, onCreated }) {
  const [modelo, setModelo] = useState('')
  const [err, setErr] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onClose])

  const crear = async (e) => {
    e.preventDefault()
    setErr('')
    setEnviando(true)
    try {
      await api.addToner({ modelo })
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
          <h2 id="modal-titulo">Nuevo tóner</h2>
          <button type="button" className="modal-cerrar" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <label>Modelo
          <input value={modelo} onChange={(e) => setModelo(e.target.value)} required autoFocus
            placeholder="Ej. TN850" autoComplete="off" />
        </label>
        <p className="hint">Después asígnalo a las impresoras en Impresoras. Se crea solo en el inventario de cada departamento.</p>

        {err && <div role="alert" className="alert error">{err}</div>}

        <div className="modal-acciones">
          <button type="button" className="btn secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Agregar tóner'}
          </button>
        </div>
      </form>
    </div>
  )
}