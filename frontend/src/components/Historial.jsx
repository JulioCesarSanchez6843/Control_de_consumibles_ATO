import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'

const ACCIONES = [
  ['salida', 'Salidas (entregas)'],
  ['entrada', 'Entradas'],
]

const PERMITIDAS = ACCIONES.map(([v]) => v).join(',')

const tono = (a) => (a === 'entrada' ? 'entrada' : 'salida')

export default function Historial() {
  const [usuarios, setUsuarios] = useState([])
  const [actividad, setActividad] = useState([])
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [filtroAccion, setFiltroAccion] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    api.usuarios().then(setUsuarios).catch((ex) => setErr(ex.message))
  }, [])

  const cargar = useCallback(async () => {
    const params = {}
    if (filtroUsuario) params.usuario = filtroUsuario
    if (filtroAccion) params.accion = filtroAccion
    else params.acciones = PERMITIDAS
    setCargando(true)
    try {
      setActividad(await api.actividad(params))
      setErr('')
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setCargando(false)
    }
  }, [filtroUsuario, filtroAccion])

  useEffect(() => { cargar() }, [cargar])

  const visibles = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return actividad
    return actividad.filter((a) =>
      a.detalle.toLowerCase().includes(t) || a.username.toLowerCase().includes(t))
  }, [actividad, busqueda])

  return (
    <div className="card">
      <div className="toolbar">
        <div>
          <h2>Historial de actividad</h2>
          <p className="subtitulo">Mostrando {visibles.length} de {actividad.length} registros recientes</p>
        </div>
        <div className="filtros">
          <input className="search" placeholder="Buscar en el detalle…" value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)} />
          <select className="search" value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)}>
            <option value="">Todos los usuarios</option>
            {usuarios.map((u) => <option key={u.id} value={u.username}>{u.username}</option>)}
          </select>
          <select className="search" value={filtroAccion} onChange={(e) => setFiltroAccion(e.target.value)}>
            <option value="">Entradas y salidas</option>
            {ACCIONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button className="btn secondary" type="button" onClick={cargar} disabled={cargando}>
            {cargando ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {err && <div className="alert error">{err}</div>}

      <table>
        <thead>
          <tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th><th>IP</th></tr>
        </thead>
        <tbody>
          {visibles.map((a) => (
            <tr key={a.id}>
              <td className="nowrap">{a.fecha}</td>
              <td><strong>{a.username || '—'}</strong></td>
              <td><span className={'tag ' + tono(a.accion)}>{a.accion_texto}</span></td>
              <td>{a.detalle}</td>
              <td className="nowrap">{a.ip}</td>
            </tr>
          ))}
          {visibles.length === 0 && <tr><td colSpan="5" className="vacio">Sin actividad.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}