import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'

export default function Departamentos({ onChange }) {
  const [lista, setLista] = useState([])
  const [nombre, setNombre] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cargar = useCallback(async () => {
    try { setLista(await api.departamentosGestion()) } catch (ex) { setErr(ex.message) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const crear = async (e) => {
    e.preventDefault()
    setErr('')
    setMsg('')
    setEnviando(true)
    try {
      const d = await api.addDepartamento({ nombre })
      setNombre('')
      setMsg(`Departamento ${d.nombre} creado`)
      await cargar()
      onChange()
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setEnviando(false)
    }
  }

  const visibles = lista.filter((d) => d.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()))

  return (
    <div className="card">
      <div className="toolbar">
        <div>
          <h2>Departamentos</h2>
          <p className="subtitulo">{lista.length} registrados</p>
        </div>
        <div className="filtros">
          <input className="search" placeholder="Buscar departamento…" value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)} />
        </div>
      </div>

      <form className="toolbar" onSubmit={crear}>
        <input className="search" placeholder="Nombre del nuevo departamento" value={nombre}
          onChange={(e) => setNombre(e.target.value)} required maxLength={100} autoComplete="off" />
        <button className="btn" type="submit" disabled={enviando}>
          {enviando ? 'Creando…' : '+ Agregar departamento'}
        </button>
      </form>

      {msg && <div className="alert ok">{msg}</div>}
      {err && <div className="alert error">{err}</div>}

      <table>
        <thead>
          <tr><th>Departamento</th><th>Creado por</th><th>Fecha</th></tr>
        </thead>
        <tbody>
          {visibles.map((d) => (
            <tr key={d.nombre}>
              <td><strong>{d.nombre}</strong></td>
              <td>{d.creado_por || '—'}</td>
              <td className="nowrap">{d.fecha || '—'}</td>
            </tr>
          ))}
          {visibles.length === 0 && <tr><td colSpan="3" className="vacio">Sin departamentos.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}