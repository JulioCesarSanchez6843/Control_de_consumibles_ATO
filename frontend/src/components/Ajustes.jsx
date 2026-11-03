import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { FILAS, FUENTES, INICIOS, PALETAS, TAMANOS } from '../preferencias'

const OPCIONES = [
  { valor: 'claro', texto: 'Claro', detalle: 'Fondo claro', icono: Sun },
  { valor: 'oscuro', texto: 'Oscuro', detalle: 'Fondo oscuro', icono: Moon },
  { valor: 'sistema', texto: 'Automático', detalle: 'Igual que tu equipo', icono: Monitor },
]

export default function Ajustes({ prefs: guardadas, onPref, onVista }) {
  const [prefs, setPrefs] = useState(guardadas)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const hayCambios = Object.keys(guardadas).some((k) => prefs[k] !== guardadas[k])

  useEffect(() => {
    onVista(hayCambios ? prefs : null)
  }, [prefs, hayCambios, onVista])

  useEffect(() => () => onVista(null), [onVista])

  const cambiar = (cambio) => {
    setPrefs((p) => ({ ...p, ...cambio }))
    setMsg('')
    setErr('')
  }

  const descartar = () => {
    setPrefs(guardadas)
    setMsg('')
    setErr('')
  }

  const guardar = async () => {
    setMsg('')
    setErr('')
    setGuardando(true)
    try {
      await onPref(prefs)
      setMsg('Cambios guardados')
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="pagina">
      <div className="pagina-cabecera">
        <div>
          <h2>Configuración</h2>
          <p className="subtitulo">Los cambios se ven al instante, pero solo se conservan al guardar.</p>
        </div>
        <div className="pagina-acciones">
          {err && <span role="alert" className="estado error">{err}</span>}
          {!err && msg && <span role="status" className="estado ok">{msg}</span>}
          {!err && !msg && hayCambios && <span className="estado">Cambios sin guardar</span>}
          {hayCambios && (
            <button type="button" className="btn secondary" disabled={guardando} onClick={descartar}>
              Descartar
            </button>
          )}
          <button type="button" className="btn" disabled={!hayCambios || guardando} onClick={guardar}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <div className="pagina-grid">
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
          <h2>Estilo</h2>
          <p className="subtitulo">Color, tipo de letra y tamaño del texto.</p>

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
        </section>

        <section className="card">
          <h2>Uso diario</h2>
          <p className="subtitulo">Se guarda en tu cuenta y te acompaña en cualquier equipo.</p>

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
      </div>
    </div>
  )
}