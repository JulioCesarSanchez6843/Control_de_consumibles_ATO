import { useEffect, useRef, useState } from 'react'

const UNIDADES = ['PIEZA', 'CAJA', 'PAQUETE', 'JUEGO', 'LITRO', 'KILO', 'METRO', 'SERVICIO']
const VACIO = { item: '', cantidad: '1', unidad: 'PIEZA', costo: '', link: '', descripcion: '' }

const desdeNota = (n) => ({
  item: n.item,
  cantidad: String(n.cantidad),
  unidad: n.unidad,
  costo: n.costo == null ? '' : String(n.costo),
  link: n.link,
  descripcion: n.descripcion,
})

export default function PendienteModal({ nota, onClose, onGuardar }) {
  const [f, setF] = useState(nota ? desdeNota(nota) : VACIO)
  const [err, setErr] = useState('')
  const [enviando, setEnviando] = useState(false)
  const itemRef = useRef(null)

  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onClose])

  const set = (campo) => (e) => setF({ ...f, [campo]: e.target.value })

  const enviar = async (seguir) => {
    if (!f.item.trim()) {
      setErr('Escribe qué hay que comprar')
      return
    }
    setErr('')
    setEnviando(true)
    try {
      await onGuardar(f, seguir)
      if (seguir) {
        setF(VACIO)
        setEnviando(false)
        if (itemRef.current) itemRef.current.focus()
      }
    } catch (ex) {
      setErr(ex.message)
      setEnviando(false)
    }
  }

  return (
    <div className="modal-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form className="modal modal-ancho" role="dialog" aria-modal="true" aria-labelledby="pend-titulo"
        onSubmit={(e) => { e.preventDefault(); enviar(false) }}>
        <div className="modal-cabecera">
          <h2 id="pend-titulo">{nota ? 'Editar artículo' : 'Agregar al checklist'}</h2>
          <button type="button" className="modal-cerrar" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <label>Artículo *
          <input ref={itemRef} value={f.item} maxLength={200} onChange={set('item')} autoFocus
            autoComplete="off" placeholder="Ej. Tóner HP 83A" />
        </label>
        <div className="fila-2">
          <label>Cantidad
            <input type="number" min="0.01" step="any" value={f.cantidad} onChange={set('cantidad')} />
          </label>
          <label>Unidad
            <select value={f.unidad} onChange={set('unidad')}>
              {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
        </div>
        <div className="fila-2">
          <label>Costo unitario
            <input type="number" min="0" step="0.01" value={f.costo} onChange={set('costo')} placeholder="Opcional" />
          </label>
          <label>Enlace
            <input inputMode="url" maxLength={500} value={f.link} onChange={set('link')}
              autoComplete="off" placeholder="https://… (opcional)" />
          </label>
        </div>
        <label>Descripción
          <input value={f.descripcion} maxLength={500} onChange={set('descripcion')}
            autoComplete="off" placeholder="Opcional" />
        </label>

        {err && <div role="alert" className="alert error">{err}</div>}

        <div className="modal-acciones">
          <button type="button" className="btn secondary" onClick={onClose}>Cancelar</button>
          {!nota && (
            <button type="button" className="btn secondary" disabled={enviando} onClick={() => enviar(true)}>
              Agregar y otro
            </button>
          )}
          <button type="submit" className="btn" disabled={enviando}>
            {enviando ? 'Guardando…' : nota ? 'Guardar cambios' : 'Agregar'}
          </button>
        </div>
      </form>
    </div>
  )
}