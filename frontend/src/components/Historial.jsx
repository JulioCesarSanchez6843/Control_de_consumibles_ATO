import { useEffect, useState, useCallback, useMemo } from 'react'
import { api } from '../api'
import Paginador from './Paginador'
import useListaPaginada from '../useListaPaginada'

const ACCIONES = [
  ['salida', 'Salidas (entregas)'],
  ['entrada', 'Entradas'],
  ['anulacion', 'Movimientos anulados'],
  ['nota_alta', 'Checklist: agregado'],
  ['nota_edicion', 'Checklist: editado'],
  ['nota_baja', 'Checklist: quitado'],
  ['nota_requisicion', 'Checklist: enviado a requisición'],
  ['nota_completada', 'Checklist: completado'],
  ['requisicion_excel', 'Requisición descargada'],
  ['consumible_alta', 'Consumible creado'],
  ['consumible_edicion', 'Consumible editado'],
  ['impresora_alta', 'Impresora creada'],
  ['impresora_edicion', 'Impresora editada'],
  ['impresora_baja', 'Impresora eliminada'],
  ['linea_alta', 'Consumible agregado a impresora'],
  ['linea_baja', 'Consumible quitado de impresora'],
  ['usuario_alta', 'Usuario creado'],
  ['usuario_edicion', 'Usuario editado'],
  ['login', 'Inicio de sesión'],
  ['logout', 'Cierre de sesión'],
  ['login_fallido', 'Intento de sesión fallido'],
]

const VERDES = ['entrada', 'nota_alta', 'nota_completada', 'consumible_alta', 'impresora_alta', 'linea_alta', 'usuario_alta', 'login']
const AMBAR = ['salida', 'nota_edicion', 'nota_requisicion', 'requisicion_excel', 'consumible_edicion', 'impresora_edicion', 'usuario_edicion']
const ROJOS = ['anulacion', 'nota_baja', 'impresora_baja', 'linea_baja', 'login_fallido']

const tono = (a) => (VERDES.includes(a) ? 'entrada' : ROJOS.includes(a) ? 'agotado' : AMBAR.includes(a) ? 'salida' : 'neutro')

export default function Historial({ filas = 25 }) {
  const [usuarios, setUsuarios] = useState([])
  const [errUsuarios, setErrUsuarios] = useState('')
  const lista = useListaPaginada(api.actividad, { filas, claves: ['usuario', 'accion'] })

  useEffect(() => {
    api.usuarios().then(setUsuarios).catch((ex) => setErrUsuarios(ex.message))
  }, [])

  const cargar = useCallback(async () => {
    const params = {}
    if (filtroUsuario) params.usuario = filtroUsuario
    if (filtroAccion) params.accion = filtroAccion
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
          <p className="subtitulo">{pag.cantidad} registros</p>
        </div>
        <div className="filtros">
          <input className="search" placeholder="Buscar en el detalle…" value={lista.texto}
            onChange={(e) => lista.setTexto(e.target.value)} />
          <select className="search" value={lista.filtros.usuario} onChange={(e) => lista.setFiltro('usuario', e.target.value)}>
            <option value="">Todos los usuarios</option>
            {usuarios.map((u) => <option key={u.id} value={u.username}>{u.username}</option>)}
          </select>
          <select className="search" value={lista.filtros.accion} onChange={(e) => lista.setFiltro('accion', e.target.value)}>
            <option value="">Toda la actividad</option>
            {ACCIONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button className="btn secondary" type="button" onClick={lista.recargar} disabled={lista.cargando}>
            {lista.cargando ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {(lista.error || errUsuarios) && <div className="alert error">{lista.error || errUsuarios}</div>}

      <table>
        <thead>
          <tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th><th>IP</th></tr>
        </thead>
        <tbody>
          {pag.items.map((a) => (
            <tr key={a.id}>
              <td className="nowrap">{a.fecha}</td>
              <td><strong>{a.username || '—'}</strong></td>
              <td><span className={'tag ' + tono(a.accion)}>{a.accion_texto}</span></td>
              <td>{a.detalle}</td>
              <td className="nowrap">{a.ip}</td>
            </tr>
          ))}
          {!lista.cargando && pag.items.length === 0 && <tr><td colSpan="5" className="vacio">Sin actividad.</td></tr>}
        </tbody>
      </table>
      <Paginador p={pag} />
    </div>
  )
}