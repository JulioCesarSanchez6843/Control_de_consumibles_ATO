import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import Salidas from './components/Salidas'
import Entradas from './components/Entradas'
import Stock from './components/Stock'
import Impresoras from './components/Impresoras'
import Login from './components/Login'
import Usuarios from './components/Usuarios'
import Historial from './components/Historial'
import MenuUsuario from './components/MenuUsuario'
import Ajustes from './components/Ajustes'
import useTema from './useTema'
import { aplicar, normalizar } from './preferencias'
import { Boxes, ClipboardList, History as IcoHistorial, PackageMinus, PackagePlus, Printer, ShieldCheck, Users, Warehouse } from 'lucide-react'

const GRUPOS = [
  { nombre: 'Bitácora', icono: ClipboardList, tabs: ['Salidas', 'Entradas'] },
  { nombre: 'Inventarios', icono: Warehouse, tabs: ['Inventario', 'Impresoras'] },
  { nombre: 'Equipo TI', icono: ShieldCheck, tabs: ['Usuarios', 'Historial'], admin: true },
]

const ETIQUETAS = { Inventario: 'Stock' }

const ICONOS = {
  Salidas: PackageMinus,
  Entradas: PackagePlus,
  Inventario: Boxes,
  Impresoras: Printer,
  Usuarios: Users,
  Historial: IcoHistorial,
}

function Ico({ t }) {
  const Icono = ICONOS[t]
  return <Icono size={17} strokeWidth={2.2} />
}

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

    const { aplicado, setTema } = useTema()
  const prefs = normalizar(usuario && usuario.preferencias)

  useEffect(() => {
    aplicar(prefs, aplicado)
  }, [prefs.color, prefs.fuente, prefs.tamano, aplicado])

  useEffect(() => {
    if (usuario) setTema(prefs.tema)
  }, [usuario && usuario.username, prefs.tema, setTema])

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
      .then((u) => { setTab(normalizar(u.preferencias).inicio); setUsuario(u) })
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

  useEffect(() => {
    if (tab !== 'Salidas') setPrefill(null)
    if (tab !== 'Entradas') setPrefillEntrada(null)
  }, [tab])

  const salir = async () => {
    try { await api.logout() } catch {}
    setUsuario(null)
    setCargando(true)
  }

  const guardarPref = async (cambio) => {
    setUsuario((u) => ({ ...u, preferencias: { ...normalizar(u.preferencias), ...cambio } }))
    try {
      setUsuario(await api.updatePreferencias(cambio))
    } catch (e) {
      api.me().then(setUsuario).catch(() => {})
      throw e
    }
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
  const grupos = GRUPOS.filter((g) => !g.admin || usuario?.es_admin)
  const enAjustes = tab === 'Ajustes'
  const grupo = enAjustes ? null : (grupos.find((g) => g.tabs.includes(tab)) || grupos[0])

  if (!sesionLista) return <div className="cargando"><span className="spinner" />Cargando…</div>
  if (!usuario) return <Login onLogin={(u) => { setTab(normalizar(u.preferencias).inicio); setUsuario(u) }} />

  return (
    <>
      <header className="topbar">
         <div className="marca" role="button" tabIndex={0} title="Ir a la bitácora"
          onClick={() => setTab('Salidas')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTab('Salidas') } }}>
          <img src="/static/logo_tollocan.png" alt="Grupo Tollocan" className="logo" />
          <div className="marca-texto">
            <strong>Control de consumibles</strong>
            <span>Grupo Tollocan</span>
          </div>
        </div>
        <nav className="tabs">
          {grupos.map((g) => {
            const Icono = g.icono
            const activo = g === grupo
            return (
              <button key={g.nombre} className={activo ? 'active' : ''}
                onClick={() => { if (!activo) setTab(g.tabs[0]) }}>
                <Icono size={17} strokeWidth={2.2} />
                <span>{g.nombre}</span>
                {g.tabs.includes('Inventario') && bajos > 0 && <span className="badge">{bajos}</span>}
              </button>
            )
          })}
        </nav>
        <div className="usuario">
          <button type="button" className="usuario-perfil" title="Editar mi perfil" onClick={() => setTab('Ajustes')}>
            {usuario.foto
              ? <img className="avatar" src={usuario.foto} alt="" />
              : <div className="avatar">{(usuario.nombre || usuario.username || '?').slice(0, 1).toUpperCase()}</div>}
            <div className="usuario-datos">
              <strong>{usuario.nombre || usuario.username}</strong>
              <span>{usuario.es_admin ? 'Encargado' : 'Becario'}</span>
            </div>
          </button>
          <MenuUsuario onAjustes={() => setTab('Ajustes')} onSalir={salir} />
        </div>
      </header>

      <div className={'shell' + (enAjustes ? ' sin-sub' : '')}>
      {grupo && (
        <nav className="subnav" key={grupo.nombre}>
          <span className="subnav-titulo">{grupo.nombre}</span>
          {grupo.tabs.map((t) => (
            <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
              <Ico t={t} />
              <span>{ETIQUETAS[t] || t}</span>
              {t === 'Inventario' && bajos > 0 && <span className="badge">{bajos}</span>}
            </button>
          ))}
        </nav>
      )}

      <div className="app">

      {error && (
        <div className="alert error">{error} <button className="link" onClick={reload}>Reintentar</button></div>
      )}
      {cargando && <div className="cargando"><span className="spinner" />Cargando datos…</div>}

      <main key={tab} hidden={cargando} className="vista">
        {tab === 'Salidas' && (
          <Salidas consumables={consumables} departamentos={departamentos} printers={printers}
            movements={movements} prefill={prefill} onDone={reload} filas={prefs.filas} />
        )}
        {tab === 'Entradas' && (
          <Entradas consumables={consumables} movements={movements} prefill={prefillEntrada} onDone={reload} filas={prefs.filas} />
        )}
        {tab === 'Inventario' && (
            <Stock consumables={consumables} departamentos={departamentos} onChange={reload} filas={prefs.filas}
            onMover={entregar} onRecibir={recibir} />
        )}
        {tab === 'Impresoras' && (
          <Impresoras printers={printers} consumables={consumables} departamentos={departamentos}
            onEntregar={entregar} onChange={reload} />
        )}
        {tab === 'Usuarios' && usuario.es_admin && <Usuarios usuarioActual={usuario} />}
        {tab === 'Historial' && usuario.es_admin && <Historial filas={prefs.filas} />}
        {tab === 'Ajustes' && (
          <Ajustes usuario={usuario} onSalir={salir} onPerfil={setUsuario} prefs={prefs} onPref={guardarPref} />
        )}
      </main>
      </div>
      </div>
    </>
  )
}