import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'

const NUEVO = { username: '', nombre: '', password: '', rol: 'becario' }

const ACCIONES = [
  ['login', 'Inicio de sesión'],
  ['login_fallido', 'Intento de sesión fallido'],
  ['logout', 'Cierre de sesión'],
  ['salida', 'Salida registrada'],
  ['entrada', 'Entrada registrada'],
  ['anulacion', 'Movimiento anulado'],
  ['consumible_alta', 'Consumible creado'],
  ['consumible_edicion', 'Consumible editado'],
  ['impresora_alta', 'Impresora creada'],
  ['impresora_edicion', 'Impresora editada'],
  ['impresora_baja', 'Impresora eliminada'],
  ['linea_alta', 'Consumible agregado a impresora'],
  ['linea_baja', 'Consumible quitado de impresora'],
  ['usuario_alta', 'Usuario creado'],
  ['usuario_edicion', 'Usuario editado'],
]

export default function Usuarios({ usuarioActual }) {
  const [usuarios, setUsuarios] = useState([])
  const [actividad, setActividad] = useState([])
  const [nuevo, setNuevo] = useState(NUEVO)
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [filtroAccion, setFiltroAccion] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  const cargarUsuarios = useCallback(async () => {
    try { setUsuarios(await api.usuarios()) } catch (ex) { setErr(ex.message) }
  }, [])

  const cargarActividad = useCallback(async () => {
    const params = {}
    if (filtroUsuario) params.usuario = filtroUsuario
    if (filtroAccion) params.accion = filtroAccion
    try { setActividad(await api.actividad(params)) } catch (ex) { setErr(ex.message) }
  }, [filtroUsuario, filtroAccion])

  useEffect(() => { cargarUsuarios() }, [cargarUsuarios])
  useEffect(() => { cargarActividad() }, [cargarActividad])

  const set = (k) => (e) => setNuevo({ ...nuevo, [k]: e.target.value })

  const crear = async (e) => {
    e.preventDefault()
    setErr('')
    setMsg('')
    try {
      const u = await api.addUsuario({
        username: nuevo.username, nombre: nuevo.nombre, password: nuevo.password,
        es_admin: nuevo.rol === 'encargado',
      })
      setMsg(`Usuario ${u.username} creado`)
      setNuevo(NUEVO)
      cargarUsuarios()
      cargarActividad()
    } catch (ex) {
      setErr(ex.message)
    }
  }

  const cambiar = async (u, datos, texto) => {
    setErr('')
    setMsg('')
    try {
      await api.updateUsuario(u.id, datos)
      setMsg(texto)
      cargarUsuarios()
      cargarActividad()
    } catch (ex) {
      setErr(ex.message)
    }
  }

  const nuevaClave = (u) => {
    const p = window.prompt(`Nueva contraseña para ${u.username} (mínimo 6 caracteres):`)
    if (p) cambiar(u, { password: p }, `Contraseña de ${u.username} actualizada`)
  }

  return (
    <>
      <div className="grid2">
        <div className="card">
          <h2>Registrar usuario</h2>
          <form onSubmit={crear}>
            <label>Usuario
              <input value={nuevo.username} onChange={set('username')} required autoComplete="off" />
            </label>
            <label>Nombre completo (opcional)
              <input value={nuevo.nombre} onChange={set('nombre')} autoComplete="off" />
            </label>
            <label>Contraseña
              <input type="password" value={nuevo.password} onChange={set('password')} required
                minLength={6} autoComplete="new-password" />
            </label>
            <label>Rol
              <select value={nuevo.rol} onChange={set('rol')}>
                <option value="becario">Becario</option>
                <option value="encargado">Encargado</option>
              </select>
            </label>
            <button className="btn" type="submit">Crear usuario</button>
          </form>
          {msg && <div className="alert ok">{msg}</div>}
          {err && <div className="alert error">{err}</div>}
        </div>

        <div className="card">
          <h2>Usuarios</h2>
          <table>
            <thead>
              <tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const yo = u.username === usuarioActual.username
                return (
                  <tr key={u.id} className={u.activo ? '' : 'muted'}>
                    <td>{u.username}</td>
                    <td>{u.nombre}</td>
                    <td><span className={'tag ' + (u.es_admin ? 'entrada' : 'salida')}>{u.es_admin ? 'Encargado' : 'Becario'}</span></td>
                    <td>{u.activo ? 'Activo' : 'Desactivado'}</td>
                    <td>{u.ultimo_acceso}</td>
                    <td className="acciones">
                      <button className="link" disabled={yo}
                        onClick={() => cambiar(u, { activo: !u.activo }, `${u.username}: ${u.activo ? 'desactivado' : 'activado'}`)}>
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button className="link" disabled={yo}
                        onClick={() => cambiar(u, { es_admin: !u.es_admin }, `${u.username}: rol actualizado`)}>
                        {u.es_admin ? 'Hacer becario' : 'Hacer encargado'}
                      </button>
                      <button className="link" onClick={() => nuevaClave(u)}>Contraseña</button>
                    </td>
                  </tr>
                )
              })}
              {usuarios.length === 0 && <tr><td colSpan="6">Sin usuarios.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="toolbar">
          <h2>Actividad de usuarios</h2>
          <div className="toolbar">
            <select className="search" value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)}>
              <option value="">Todos los usuarios</option>
              {usuarios.map((u) => <option key={u.id} value={u.username}>{u.username}</option>)}
            </select>
            <select className="search" value={filtroAccion} onChange={(e) => setFiltroAccion(e.target.value)}>
              <option value="">Todas las acciones</option>
              {ACCIONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button className="btn secondary" type="button" onClick={cargarActividad}>Actualizar</button>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th><th>IP</th></tr>
          </thead>
          <tbody>
            {actividad.map((a) => (
              <tr key={a.id}>
                <td>{a.fecha}</td>
                <td>{a.username}</td>
                <td>{a.accion_texto}</td>
                <td>{a.detalle}</td>
                <td>{a.ip}</td>
              </tr>
            ))}
            {actividad.length === 0 && <tr><td colSpan="5">Sin actividad.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}