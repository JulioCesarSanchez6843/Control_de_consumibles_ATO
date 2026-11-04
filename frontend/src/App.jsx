import { useCallback, useEffect, useRef, useState } from 'react'
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
import Perfil from './components/Perfil'
import Requisicion from './components/Requisicion'
import PendientesCompra from './components/PendientesCompra'
import useTema from './useTema'
import { aplicar, normalizar } from './preferencias'
import { Boxes, CheckCheck, ClipboardList, FileText, History as IcoHistorial, ListChecks, PackageMinus, PackagePlus, Printer, ShieldCheck, ShoppingCart, Users, Warehouse } from 'lucide-react'

const GRUPOS = [
  { nombre: 'Bitácora', icono: ClipboardList, tabs: ['Salidas', 'Entradas'] },
  { nombre: 'Inventarios', icono: Warehouse, tabs: ['Inventario', 'Impresoras'] },
  { nombre: 'Compras', icono: ShoppingCart, tabs: ['Requisición', 'Por comprar'] },
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
  'Por comprar': ListChecks,
}

function Ico({ t }) {
  const Icono = ICONOS[t] || FileText
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
  const [prefillReq, setPrefillReq] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [usuario, setUsuario] = useState(null)
  const [sesionLista, setSesionLista] = useState(false)
  const colaPref = useRef(Promise.resolve())
  const pendientes = useRef(0)
  const [vista, setVista] = useState(null)

    const { aplicado, setTema } = useTema()
  const prefs = normalizar(usuario && usuario.preferencias)
  const efectivas = vista || prefs

  useEffect(() => {
    aplicar(efectivas, aplicado)
  }, [efectivas.color, efectivas.fuente, efectivas.tamano, aplicado])

  useEffect(() => {
    if (usuario) setTema(efectivas.tema, !vista)
  }, [usuario && usuario.username, efectivas.tema, vista, setTema])

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

  const guardarPref = (cambio) => {
    setUsuario((u) => ({ ...u, preferencias: { ...normalizar(u.preferencias), ...cambio } }))
    pendientes.current += 1
    const tarea = colaPref.current.then(async () => {
      try {
        const u = await api.updatePreferencias(cambio)
        if (pendientes.current === 1) setUsuario(u)
      } catch (e) {
        api.me().then(setUsuario).catch(() => {})
        throw e
      } finally {
        pendientes.current -= 1
      }
    })
    colaPref.current = tarea.catch(() => {})
    return tarea
  }

  const entregar = (consumable_id, departamento) => {
    setPrefill({ consumable_id, departamento })
    setTab('Salidas')
  }

  const recibir = (consumable_id) => {
    setPrefillEntrada({ consumable_id })
    setTab('Entradas')
  }

  const pasarARequisicion = (lineas) => {
    setPrefillReq(lineas)
    setTab('Requisición')
  }

  const bajos = consumables.filter((c) => c.stock <= c.stock_minimo).length
  const grupos = GRUPOS.filter((g) => !g.admin || usuario?.es_admin)
  const enAjustes = tab === 'Ajustes' || tab === 'Perfil'
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
          <button type="button" className="usuario-perfil" title="Editar mi perfil" onClick={() => setTab('Perfil')}>
            {usuario.foto
              ? <img className="avatar" src={usuario.foto} alt="" />
              : <div className="avatar">{(usuario.nombre || usuario.username || '?').slice(0, 1).toUpperCase()}</div>}
            <div className="usuario-datos">
              <strong>{usuario.nombre || usuario.username}</strong>
              <span>{usuario.es_admin ? 'Encargado' : 'Becario'}</span>
            </div>
          </button>
          <MenuUsuario onPerfil={() => setTab('Perfil')} onAjustes={() => setTab('Ajustes')} onSalir={salir} />
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
        {tab === 'Requisición' && (
          <Requisicion usuario={usuario} departamentos={departamentos} prefill={prefillReq}
            onUsado={() => setPrefillReq(null)} />
        )}
        {tab === 'Por comprar' && <PendientesCompra usuario={usuario} onRequisicion={pasarARequisicion} />}
        {tab === 'Ajustes' && (
          <Ajustes prefs={prefs} onPref={guardarPref} onVista={setVista} />
        )}
        {tab === 'Perfil' && (
          <Perfil usuario={usuario} onPerfil={setUsuario} onSalir={salir} />
        )}
      </main>
      </div>
      </div>
    </>
  )
}