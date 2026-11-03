import { useRef, useState } from 'react'
import { Camera, LogOut, Trash2 } from 'lucide-react'
import { api } from '../api'

function reducirFoto(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onerror = () => reject(new Error('No se pudo leer la imagen'))
    lector.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('El archivo no es una imagen válida'))
      img.onload = () => {
        const lado = 256
        const corte = Math.min(img.width, img.height)
        const sx = (img.width - corte) / 2
        const sy = (img.height - corte) / 2
        const canvas = document.createElement('canvas')
        canvas.width = lado
        canvas.height = lado
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, lado, lado)
        ctx.drawImage(img, sx, sy, corte, corte, 0, 0, lado, lado)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = lector.result
    }
    lector.readAsDataURL(archivo)
  })
}

export default function Perfil({ usuario, onPerfil, onSalir }) {
  const [nombre, setNombre] = useState(usuario.nombre || '')
  const [foto, setFoto] = useState(usuario.foto || '')
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const entrada = useRef(null)

  const hayCambios = nombre.trim() !== (usuario.nombre || '') || foto !== (usuario.foto || '')
  const rol = usuario.es_admin ? 'Encargado' : 'Becario'

  const elegir = async (e) => {
    const archivo = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!archivo) return
    setErr('')
    setMsg('')
    if (!archivo.type.startsWith('image/')) {
      setErr('Elige un archivo de imagen')
      return
    }
    try {
      setFoto(await reducirFoto(archivo))
    } catch (ex) {
      setErr(ex.message)
    }
  }

  const guardar = async (e) => {
    e.preventDefault()
    setErr('')
    setMsg('')
    if (!nombre.trim()) {
      setErr('El nombre no puede quedar vacío')
      return
    }
    setGuardando(true)
    try {
      const u = await api.updatePerfil({ nombre: nombre.trim(), foto })
      onPerfil(u)
      setNombre(u.nombre || '')
      setFoto(u.foto || '')
      setMsg('Perfil actualizado')
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="pagina" onSubmit={guardar}>
      <div className="pagina-cabecera">
        <div>
          <h2>Mi perfil</h2>
          <p className="subtitulo">Tu foto y tu nombre aparecen en la barra superior.</p>
        </div>
      </div>

      <div className="perfil-grid">
        <section className="card perfil-lateral">
          {foto
            ? <img className="perfil-img" src={foto} alt="Foto de perfil" />
            : <div className="perfil-img perfil-inicial">{(nombre || usuario.username || '?').slice(0, 1).toUpperCase()}</div>}
          <div>
            <strong>{nombre.trim() || usuario.username}</strong>
            <div><span className="perfil-rol">{rol}</span></div>
          </div>
          <div className="perfil-foto-botones">
            <button type="button" className="btn secondary" onClick={() => entrada.current.click()}>
              <Camera size={16} /> Cambiar foto
            </button>
            {foto && (
              <button type="button" className="btn secondary" onClick={() => { setFoto(''); setMsg('') }}>
                <Trash2 size={16} /> Quitar
              </button>
            )}
            <input ref={entrada} type="file" accept="image/*" hidden onChange={elegir} />
          </div>
        </section>

        <section className="card">
          <h2>Datos de la cuenta</h2>
          <label>Nombre completo
            <input value={nombre} maxLength={150} onChange={(e) => { setNombre(e.target.value); setMsg('') }} />
          </label>
          <div className="datos-fila">
            <div className="dato">
              <span className="lbl">Usuario</span>
              <strong>{usuario.username}</strong>
            </div>
            <div className="dato">
              <span className="lbl">Rol</span>
              <strong>{rol}</strong>
            </div>
          </div>
          {err && <div role="alert" className="alert error">{err}</div>}
          {msg && <div role="status" className="alert ok">{msg}</div>}
          <div className="perfil-pie">
            <button type="submit" className="btn" disabled={!hayCambios || guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button type="button" className="btn secondary" onClick={onSalir}>
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        </section>
      </div>
    </form>
  )
}