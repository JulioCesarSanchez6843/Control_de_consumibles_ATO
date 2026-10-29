import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import UsuarioModal from './UsuarioModal'

export default function Usuarios({ usuarioActual }) {
  const [usuarios, setUsuarios] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  const cargarUsuarios = useCallback(async () => {
    try { setUsuarios(await api.usuarios()) } catch (ex) { setErr(ex.message) }
  }, [])

  useEffect(() => { cargarUsuarios() }, [cargarUsuarios])

  const creado = (u) => {
    setAbierto(false)
    setErr('')
    setMsg(`Usuario ${u.username} creado`)
    cargarUsuarios()
  }

  const cambiar = async (u, datos, texto) => {
    setErr('')
    setMsg('')
    try {
      await api.updateUsuario(u.id, datos)
      setMsg(texto)
      cargarUsuarios()
    } catch (ex) {
      setErr(ex.message)
    }
  }

  const nuevaClave = (u) => {
    const p = window.prompt(`Nueva contraseña para ${u.username} (mínimo 6 caracteres):`)
    if (p) cambiar(u, { password: p }, `Contraseña de ${u.username} actualizada`)
  }

  const visibles = usuarios.filter((u) => {
    const t = busqueda.trim().toLowerCase()
    return !t || u.username.toLowerCase().includes(t) || (u.nombre || '').toLowerCase().includes(t)
  })

  const iniciales = (u) => (u.nombre || u.username).trim().slice(0, 2).toUpperCase()

  return (
    <>
      <div className="card">
        <div className="toolbar">
          <div>
            <h2>Usuarios</h2>
            <p className="subtitulo">{usuarios.length} registrados</p>
          </div>
          <div className="filtros">
            <input className="search" placeholder="Buscar usuario…" value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)} />
            <button className="btn" type="button" onClick={() => { setMsg(''); setErr(''); setAbierto(true) }}>
              + Nuevo usuario
            </button>
          </div>
        </div>

        {msg && <div className="alert ok">{msg}</div>}
        {err && <div className="alert error">{err}</div>}

        <table>
          <thead>
            <tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {visibles.map((u) => {
              const yo = u.username === usuarioActual.username
              return (
                <tr key={u.id}>
                  <td>
                    <div className="usuario-celda">
                      <span className="avatar-mini">{iniciales(u)}</span>
                      <div>
                        <strong>{u.username}</strong>{yo && <span className="tu"> (tú)</span>}
                        {u.nombre && <div className="subtitulo">{u.nombre}</div>}
                      </div>
                    </div>
                  </td>
                  <td><span className={'tag ' + (u.es_admin ? 'entrada' : 'salida')}>{u.es_admin ? 'Encargado' : 'Becario'}</span></td>
                  <td>
                    <span className="estado">
                      <span className={'punto' + (u.activo ? '' : ' off')} />
                      {u.activo ? 'Activo' : 'Desactivado'}
                    </span>
                  </td>
                  <td className="nowrap">{u.ultimo_acceso}</td>
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
            {visibles.length === 0 && <tr><td colSpan="5" className="vacio">Sin usuarios.</td></tr>}
          </tbody>
        </table>
      </div>

      {abierto && <UsuarioModal onClose={() => setAbierto(false)} onCreated={creado} />}
    </>
  )
}