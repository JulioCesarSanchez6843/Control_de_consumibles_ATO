import { useEffect, useState } from 'react'
import { api } from '../api'

const VACIO = { departamento: '', marca: '', modelo: '', tipo: '' }

export default function ImpresoraForm({ inicial, departamentos, onGuardado, onCancelar }) {
  const [d, setD] = useState({ ...VACIO, ...inicial })
  const [err, setErr] = useState('')
  const editando = Boolean(inicial && inicial.id)

  const set = (k) => (e) => setD({ ...d, [k]: e.target.value })

  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') onCancelar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onCancelar])

  const guardar = async (e) => {
    e.preventDefault()
    const datos = { departamento: d.departamento, marca: d.marca, modelo: d.modelo, tipo: d.tipo }
    try {
      if (editando) await api.updatePrinter(inicial.id, datos)
      else await api.addPrinter(datos)
      onGuardado()
    } catch (ex) { setErr(ex.message) }
  }

  return (
    <div className="modal-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancelar() }}>
      <form className="modal" onSubmit={guardar} role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
        <div className="modal-cabecera">
          <h2 id="modal-titulo">{editando ? 'Editar impresora' : 'Nueva impresora'}</h2>
          <button type="button" className="modal-cerrar" onClick={onCancelar} aria-label="Cerrar">×</button>
        </div>

        <label>Departamento
          <input required autoFocus list="lista-deptos" value={d.departamento}
            onChange={set('departamento')} autoComplete="off" />
        </label>
        <datalist id="lista-deptos">
          {departamentos.map((x) => <option key={x} value={x} />)}
        </datalist>

        <div className="fila-2">
          <label>Marca
            <input value={d.marca} onChange={set('marca')} autoComplete="off" />
          </label>
          <label>Modelo
            <input required value={d.modelo} onChange={set('modelo')} autoComplete="off" />
          </label>
        </div>

        <label>Tipo
          <input placeholder="Láser, Tinta…" value={d.tipo} onChange={set('tipo')} autoComplete="off" />
        </label>

        {err && <div role="alert" className="alert error">{err}</div>}

        <div className="modal-acciones">
          <button type="button" className="btn secondary" onClick={onCancelar}>Cancelar</button>
          <button type="submit" className="btn">{editando ? 'Guardar cambios' : 'Agregar impresora'}</button>
        </div>
      </form>
    </div>
  )
}