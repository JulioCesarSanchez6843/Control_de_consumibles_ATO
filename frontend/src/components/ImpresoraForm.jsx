import { useState } from 'react'
import { api } from '../api'

const VACIO = { departamento: '', marca: '', modelo: '', tipo: '' }

export default function ImpresoraForm({ inicial, departamentos, onGuardado, onCancelar }) {
  const [d, setD] = useState({ ...VACIO, ...inicial })
  const [err, setErr] = useState('')
  const editando = Boolean(inicial && inicial.id)

  const set = (k) => (e) => setD({ ...d, [k]: e.target.value })

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
    <div className="panel">
      <form className="inline-form" onSubmit={guardar}>
        <h3>{editando ? 'Editar impresora' : 'Agregar impresora nueva'}</h3>
        <input required list="lista-deptos" placeholder="Departamento" value={d.departamento}
          onChange={set('departamento')} />
        <datalist id="lista-deptos">
          {departamentos.map((x) => <option key={x} value={x} />)}
        </datalist>
        <input placeholder="Marca" value={d.marca} onChange={set('marca')} />
        <input required placeholder="Modelo" value={d.modelo} onChange={set('modelo')} />
        <input placeholder="Tipo (Láser, Tinta…)" value={d.tipo} onChange={set('tipo')} />
        <button className="btn" type="submit">{editando ? 'Guardar' : 'Agregar'}</button>
        <button className="btn secondary" type="button" onClick={onCancelar}>Cancelar</button>
        {err && <div className="alert error">{err}</div>}
      </form>
    </div>
  )
}