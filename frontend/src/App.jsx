import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import Salidas from './components/Salidas'
import Entradas from './components/Entradas'
import Stock from './components/Stock'
import Impresoras from './components/Impresoras'
import Login from './components/Login'
import Usuarios from './components/Usuarios'
import Departamentos from './components/Departamentos'
import Historial from './components/Historial'
import MenuUsuario from './components/MenuUsuario'
import Ajustes from './components/Ajustes'
import Perfil from './components/Perfil'
import Requisicion from './components/Requisicion'
import PendientesCompra from './components/PendientesCompra'
import Frecuentes from './components/Frecuentes'
import useTema from './useTema'
import { aplicar, normalizar } from './preferencias'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { GRUPOS, INICIO, RUTA_INICIO_DEFECTO } from './rutas'

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [consumables, setConsumables] = useState([])
  const [printers, setPrinters] = useState([])
  const [toners, setToners] = useState([])
  const [departamentos, setDepartamentos] = useState([])
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
      const [c, p, d, t] = await Promise.all([
        api.consumables(), api.printers(), api.departamentos(), api.toners(),
      ])
      setConsumables(c); setPrinters(p); setDepartamentos(d); setToners(t)
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
    navigate('/', { replace: true })
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
    navigate('/bitacora/salidas', { state: { prefill: { consumable_id, departamento } } })
  }

  const recibir = (consumable_id) => {
    navigate('/bitacora/entradas', { state: { prefill: { consumable_id } } })
  }

  const pasarARequisicion = (lineas) => {
    navigate('/compras/requisicion', { state: { lineas } })
  }

  const limpiarEstado = () => {
    navigate(location.pathname + location.search, { replace: true, state: null })
  }

  const bajos = consumables.filter((c) => c.stock <= c.stock_minimo).length
  const grupos = GRUPOS.filter((g) => !g.admin || usuario?.es_admin)
  const grupo = grupos.find((g) => location.pathname.startsWith(g.ruta + '/')) || null
  const enAjustes = !grupo

  if (!sesionLista) return <div className="cargando"><span className="spinner" />Cargando…</div>
  if (!usuario) return <Login onLogin={setUsuario} />

  return (
    <>
      <header className="topbar">
         <div className="marca" role="button" tabIndex={0} title="Ir a la bitácora"
          onClick={() => navigate('/bitacora/salidas')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/bitacora/salidas') } }}>
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
                onClick={() => { if (!activo) navigate(g.tabs[0].ruta) }}>
                <Icono size={17} strokeWidth={2.2} />
                <span>{g.nombre}</span>
                {g.ruta === '/inventarios' && bajos > 0 && <span className="badge">{bajos}</span>}
              </button>
            )
          })}
        </nav>
        <div className="usuario">
          <button type="button" className="usuario-perfil" title="Editar mi perfil" onClick={() => navigate('/perfil')}>
            {usuario.foto
              ? <img className="avatar" src={usuario.foto} alt="" />
              : <div className="avatar">{(usuario.nombre || usuario.username || '?').slice(0, 1).toUpperCase()}</div>}
            <div className="usuario-datos">
              <strong>{usuario.nombre || usuario.username}</strong>
              <span>{usuario.es_admin ? 'Encargado' : 'Becario'}</span>
            </div>
          </button>
          <MenuUsuario onPerfil={() => navigate('/perfil')} onAjustes={() => navigate('/ajustes')} onSalir={salir} />
        </div>
      </header>

      <div className={'shell' + (enAjustes ? ' sin-sub' : '')}>
      {grupo && (
        <nav className="subnav" key={grupo.nombre}>
          <span className="subnav-titulo">{grupo.nombre}</span>
          {grupo.tabs.map((t) => {
            const Icono = t.icono
            return (
              <button key={t.ruta} className={location.pathname.startsWith(t.ruta) ? 'active' : ''}
                onClick={() => navigate(t.ruta)}>
                <Icono size={17} strokeWidth={2.2} />
                <span>{t.etiqueta}</span>
                {t.ruta === '/inventarios/stock' && bajos > 0 && <span className="badge">{bajos}</span>}
              </button>
            )
          })}
        </nav>
      )}

      <div className="app">

      {error && (
        <div className="alert error">{error} <button className="link" onClick={reload}>Reintentar</button></div>
      )}
      {cargando && <div className="cargando"><span className="spinner" />Cargando datos…</div>}

      <main key={location.pathname} hidden={cargando} className="vista">
        <Routes>
          <Route path="/" element={<Navigate to={INICIO[prefs.inicio] || RUTA_INICIO_DEFECTO} replace />} />
          <Route path="/bitacora/salidas" element={
            <Salidas consumables={consumables} departamentos={departamentos} printers={printers}
              prefill={location.state?.prefill} onDone={reload} filas={prefs.filas} />
          } />
          <Route path="/bitacora/entradas" element={
            <Entradas consumables={consumables} prefill={location.state?.prefill}
              onDone={reload} filas={prefs.filas} />
          } />
          <Route path="/inventarios/stock" element={
            <Stock departamentos={departamentos} onChange={reload} filas={prefs.filas}
              onMover={entregar} onRecibir={recibir} />
          } />
          <Route path="/inventarios/impresoras" element={
            <Impresoras printers={printers} consumables={consumables} toners={toners} departamentos={departamentos}
              onEntregar={entregar} onChange={reload} />
          } />
          <Route path="/compras/requisicion" element={
            <Requisicion usuario={usuario} departamentos={departamentos} prefill={location.state?.lineas}
              onUsado={limpiarEstado} />
          } />
          <Route path="/compras/por-comprar" element={
            <PendientesCompra usuario={usuario} onRequisicion={pasarARequisicion} />
          } />
          <Route path="/compras/frecuentes" element={
            <Frecuentes onRequisicion={pasarARequisicion} filas={prefs.filas} />
          } />
          <Route path="/equipo/usuarios" element={
            usuario.es_admin ? <Usuarios usuarioActual={usuario} /> : <Navigate to="/" replace />
          } />
          <Route path="/equipo/departamentos" element={
            usuario.es_admin ? <Departamentos onChange={reload} /> : <Navigate to="/" replace />
          } />
          <Route path="/equipo/historial" element={
            usuario.es_admin ? <Historial filas={prefs.filas} /> : <Navigate to="/" replace />
          } />
          <Route path="/ajustes" element={<Ajustes prefs={prefs} onPref={guardarPref} onVista={setVista} />} />
          <Route path="/perfil" element={<Perfil usuario={usuario} onPerfil={setUsuario} onSalir={salir} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      </div>
      </div>
    </>
  )
}