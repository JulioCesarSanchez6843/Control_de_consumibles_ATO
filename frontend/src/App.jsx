import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import Salidas from './components/Salidas'
import Entradas from './components/Entradas'
import Stock from './components/Stock'
import Impresoras from './components/Impresoras'

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

  useEffect(() => { api.csrf().catch(() => {}).then(reload) }, [reload])

  const entregar = (consumable_id, departamento) => {
    setPrefill({ consumable_id, departamento })
    setTab('Salidas')
  }

  const recibir = (consumable_id) => {
    setPrefillEntrada({ consumable_id })
    setTab('Entradas')
  }

  const bajos = consumables.filter((c) => c.stock <= c.stock_minimo).length

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <img src="/static/logo_tollocan.png" alt="Grupo Tollocan" className="logo" />
          <h1>Control de consumibles</h1>
        </div>
      </header>

      <nav className="tabs">
        <div className="tabs-inner">
          {TABS.map((t) => (
            <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
              {t}{t === 'Inventario' && bajos > 0 && <span className="badge">{bajos}</span>}
            </button>
          ))}
        </div>
      </nav>

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
        {tab === 'Impresoras' && <Impresoras printers={printers} onEntregar={entregar} />}
      </main>
      </div>
    </>
  )
}
