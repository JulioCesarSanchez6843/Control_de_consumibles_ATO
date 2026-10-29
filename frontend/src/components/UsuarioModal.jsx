import { useEffect, useState } from 'react'
import { api } from '../api'

const NUEVO = { username: '', nombre: '', password: '', rol: 'becario' }

export default function UsuarioModal({ onClose, onCreated }) {
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
      const u = await api.addUsuario({
        username: f.username,
        nombre: f.nombre,
        password: f.password,
        es_admin: f.rol === 'encargado',
      })
      onCreated(u)
    } catch (ex) {
      setErr(ex.message)
      setEnviando(false)
    }
  }

  return (
    <div className="modal-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form className="modal" onSubmit={crear} role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
        <div className="modal-cabecera">
          <h2 id="modal-titulo">Registrar usuario</h2>
          <button type="button" className="modal-cerrar" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <label>Usuario
          <input value={f.username} onChange={set('username')} required autoFocus autoComplete="off" />
        </label>
        <label>Nombre completo (opcional)
          <input value={f.nombre} onChange={set('nombre')} autoComplete="off" />
        </label>
        <label>Contraseña
          <input type="password" value={f.password} onChange={set('password')} required
            minLength={6} autoComplete="new-password" />
        </label>

        <div className="field">
          <span className="lbl">Rol</span>
          <div className="seg">
            <button type="button" className={f.rol === 'becario' ? 'active' : ''}
              onClick={() => setF({ ...f, rol: 'becario' })}>Becario</button>
            <button type="button" className={f.rol === 'encargado' ? 'active' : ''}
              onClick={() => setF({ ...f, rol: 'encargado' })}>Encargado</button>
          </div>
        </div>

        {err && <div role="alert" className="alert error">{err}</div>}

        <div className="modal-acciones">
          <button type="button" className="btn secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn" disabled={enviando}>
            {enviando ? 'Creando…' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </div>
  )
}