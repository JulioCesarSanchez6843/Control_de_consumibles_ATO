import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import Salidas from './components/Salidas'
import Entradas from './components/Entradas'
import Stock from './components/Stock'
import Impresoras from './components/Impresoras'
import Login from './components/Login'
import Usuarios from './components/Usuarios'
import Historial from './components/Historial'

const TABS = ['Salidas', 'Entradas', 'Inventario', 'Impresoras']

export default function App() {
  const [tab, setTab] = useState('Salidas')
  const [consumables, setConsumables] = useState([])
  const [movements, setMovements] = useState([])
  const [printers, setPrinters] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [prefill, setPrefill] = useState(null)
  const [prefillEntrada, setPrefillEntrada] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [usuario, setUsuario] = useState(null)
  const [sesionLista, setSesionLista] = useState(false)

  const reload = useCallback(async () => {
    try {
      const [c, m, p, d] = await Promise.all([
        api.consumables(), api.movements(), api.printers(), api.departamentos(),
      ])
      setConsumables(c); setMovements(m); setPrinters(p); setDepartamentos(d)
      setError('')
    } catch (e) {
      setError('No se pudo conectar con el servidor: ' + e.message)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    api.csrf().catch(() => {})
      .then(() => api.me())
      .then(setUsuario)
      .catch(() => setUsuario(null))
      .finally(() => setSesionLista(true))
  }, [])

  useEffect(() => {
    if (usuario) reload()
  }, [usuario, reload])

  useEffect(() => {
    const cerrar = () => setUsuario(null)
    window.addEventListener('sesion-expirada', cerrar)
    return () => window.removeEventListener('sesion-expirada', cerrar)
  }, [])

  const salir = async () => {
    try { await api.logout() } catch {}
    setUsuario(null)
    setCargando(true)
  }

  const entregar = (consumable_id, departamento) => {
    setPrefill({ consumable_id, departamento })
    setTab('Salidas')
  }

  const recibir = (consumable_id) => {
    setPrefillEntrada({ consumable_id })
    setTab('Entradas')
  }

  const bajos = consumables.filter((c) => c.stock <= c.stock_minimo).length
  const tabs = usuario?.es_admin ? [...TABS, 'Usuarios', 'Historial'] : TABS

  if (!sesionLista) return <div className="cargando">Cargando…</div>
  if (!usuario) return <Login onLogin={(u) => { setTab('Salidas'); setUsuario(u) }} />

  return (
    <>
      <header className="topbar">
        <div className="marca">
          <img src="/static/logo_tollocan.png" alt="Grupo Tollocan" className="logo" />
          <div className="marca-texto">
            <strong>Control de consumibles</strong>
            <span>Grupo Tollocan</span>
          </div>
        </div>
        <nav className="tabs">
          {tabs.map((t) => (
            <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
              {t}{t === 'Inventario' && bajos > 0 && <span className="badge">{bajos}</span>}
            </button>
          ))}
        </nav>
        <div className="usuario">
          <div className="avatar">{(usuario.nombre || usuario.username || '?').slice(0, 1).toUpperCase()}</div>
          <div className="usuario-datos">
            <strong>{usuario.nombre || usuario.username}</strong>
            <span>{usuario.es_admin ? 'Encargado' : 'Becario'}</span>
          </div>
          <button className="btn-salir" onClick={salir}>Salir</button>
        </div>
      </header>

      <div className="app">

      {error && (
        <div className="alert error">{error} <button className="link" onClick={reload}>Reintentar</button></div>
      )}
      {cargando && <div className="cargando">Cargando datos…</div>}

      <main hidden={cargando}>
        {tab === 'Salidas' && (
          <Salidas consumables={consumables} departamentos={departamentos} printers={printers}
            movements={movements} prefill={prefill} onDone={reload} />
        )}
        {tab === 'Entradas' && (
          <Entradas consumables={consumables} movements={movements} prefill={prefillEntrada} onDone={reload} />
        )}
        {tab === 'Inventario' && (
          <Stock consumables={consumables} onChange={reload} onMover={entregar} onRecibir={recibir} />
        )}
        {tab === 'Impresoras' && (
          <Impresoras printers={printers} consumables={consumables} departamentos={departamentos}
            onEntregar={entregar} onChange={reload} />
        )}
        {tab === 'Usuarios' && usuario.es_admin && <Usuarios usuarioActual={usuario} />}
        {tab === 'Historial' && usuario.es_admin && <Historial />}
      </main>
      </div>
    </>
  )
}