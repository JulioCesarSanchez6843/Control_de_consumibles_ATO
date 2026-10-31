import { useRef, useState } from 'react'
import { Camera, LogOut, Monitor, Moon, Sun, Trash2 } from 'lucide-react'
import { api } from '../api'
import { FILAS, FUENTES, INICIOS, PALETAS, TAMANOS } from '../preferencias'

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

const OPCIONES = [
  { valor: 'claro', texto: 'Claro', detalle: 'Fondo claro', icono: Sun },
  { valor: 'oscuro', texto: 'Oscuro', detalle: 'Fondo oscuro', icono: Moon },
  { valor: 'sistema', texto: 'Automático', detalle: 'Igual que tu equipo', icono: Monitor },
]

export default function Ajustes({ usuario, onSalir, onPerfil, prefs, onPref }) {
  const [errPref, setErrPref] = useState('')

  const cambiar = async (cambio) => {
    setErrPref('')
    try {
      await onPref(cambio)
    } catch (ex) {
      setErrPref(ex.message)
    }
  }
  const [nombre, setNombre] = useState(usuario.nombre || '')
  const [foto, setFoto] = useState(usuario.foto || '')
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const entrada = useRef(null)

  const hayCambios = nombre.trim() !== (usuario.nombre || '') || foto !== (usuario.foto || '')

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
    <div className="ajustes">
      <div className="toolbar">
        <h2>Configuración</h2>
      </div>

      <section className="card">
        <h2>Apariencia</h2>
        <p className="subtitulo">Elige cómo quieres ver la aplicación.</p>
        <div className="temas" role="radiogroup" aria-label="Tema">
          {OPCIONES.map((o) => {
            const Icono = o.icono
            const activo = prefs.tema === o.valor
            return (
              <button key={o.valor} type="button" role="radio" aria-checked={activo}
                className={'tema-op' + (activo ? ' activo' : '')} onClick={() => cambiar({ tema: o.valor })}>
                <Icono size={22} strokeWidth={2} />
                <strong>{o.texto}</strong>
                <small>{o.detalle}</small>
              </button>
            )
          })}
        </div>
      </section>

      <section className="card">
        <h2>Personalización</h2>
        <p className="subtitulo">Se guarda en tu cuenta y te acompaña en cualquier equipo.</p>
        {errPref && <div role="alert" className="alert error">{errPref}</div>}

        <div className="field">
          <span className="lbl">Color</span>
          <div className="colores">
            {Object.entries(PALETAS).map(([clave, p]) => (
              <button key={clave} type="button" title={p.nombre} aria-label={p.nombre}
                aria-pressed={prefs.color === clave} style={{ background: p.primary }}
                className={'color-op' + (prefs.color === clave ? ' activo' : '')}
                onClick={() => cambiar({ color: clave })} />
            ))}
          </div>
        </div>

        <div className="field">
          <span className="lbl">Letra</span>
          <div className="opciones-fila">
            {Object.entries(FUENTES).map(([clave, f]) => (
              <button key={clave} type="button" aria-pressed={prefs.fuente === clave}
                style={{ fontFamily: f.familia }}
                className={'chip-op' + (prefs.fuente === clave ? ' activo' : '')}
                onClick={() => cambiar({ fuente: clave })}>{f.nombre}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="lbl">Tamaño del texto</span>
          <div className="opciones-fila">
            {Object.entries(TAMANOS).map(([clave, t]) => (
              <button key={clave} type="button" aria-pressed={prefs.tamano === clave}
                className={'chip-op' + (prefs.tamano === clave ? ' activo' : '')}
                onClick={() => cambiar({ tamano: clave })}>{t.nombre}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="lbl">Filas por página en las tablas</span>
          <div className="opciones-fila">
            {FILAS.map((n) => (
              <button key={n} type="button" aria-pressed={prefs.filas === n}
                className={'chip-op' + (prefs.filas === n ? ' activo' : '')}
                onClick={() => cambiar({ filas: n })}>{n}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="lbl">Pantalla al iniciar sesión</span>
          <div className="opciones-fila">
            {INICIOS.map(([valor, texto]) => (
              <button key={valor} type="button" aria-pressed={prefs.inicio === valor}
                className={'chip-op' + (prefs.inicio === valor ? ' activo' : '')}
                onClick={() => cambiar({ inicio: valor })}>{texto}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Mi perfil</h2>
        <form onSubmit={guardar}>
          <div className="perfil-foto">
            {foto
              ? <img className="perfil-img" src={foto} alt="Foto de perfil" />
              : <div className="perfil-img perfil-inicial">{(nombre || usuario.username || '?').slice(0, 1).toUpperCase()}</div>}
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
          </div>
          <label>Nombre completo
            <input value={nombre} maxLength={150} onChange={(e) => { setNombre(e.target.value); setMsg('') }} />
          </label>
          <dl className="cuenta">
            <dt>Usuario</dt>
            <dd>{usuario.username}</dd>
            <dt>Rol</dt>
            <dd>{usuario.es_admin ? 'Encargado' : 'Becario'}</dd>
          </dl>
          {err && <div role="alert" className="alert error">{err}</div>}
          {msg && <div role="status" className="alert ok">{msg}</div>}
          <div className="perfil-acciones">
            <button type="submit" className="btn" disabled={!hayCambios || guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button type="button" className="btn secondary ajustes-salir" onClick={onSalir}>
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}