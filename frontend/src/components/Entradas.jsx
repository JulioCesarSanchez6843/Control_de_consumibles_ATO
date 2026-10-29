import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import usePersistido from '../usePersistido'
import { useToast } from './Toast'

const VACIO = { consumable_id: '', cantidad: 1, proveedor: '', notas: '' }

export default function Entradas({ consumables, movements, prefill, onDone }) {
  const [f, setF] = useState(VACIO)
  const [msg, setMsg] = useState(null)
  const [busca, setBusca] = useState('')
  const [err, setErr] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [panel, setPanel] = usePersistido('panel-entradas', true)
  const toast = useToast()
  const [deptoSel, setDeptoSel] = useState('')
  const [q, setQ] = useState('')
  const [deptoFiltro, setDeptoFiltro] = useState('')
  const timer = useRef(null)

  useEffect(() => {
    if (prefill) setF((p) => ({ ...p, consumable_id: prefill.consumable_id ?? '' }))
  }, [prefill])

  useEffect(() => () => clearTimeout(timer.current), [])

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const sel = consumables.find((c) => c.id === Number(f.consumable_id))

  const deptos = useMemo(
    () => [...new Set(consumables.map((c) => c.departamento).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [consumables])

  const opciones = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return consumables
      .filter((c) => !deptoSel || c.departamento === deptoSel)
      .filter((c) => !t || c.id === Number(f.consumable_id) ||
        `${c.departamento} ${c.modelo} ${c.descripcion} ${c.marca}`.toLowerCase().includes(t))
  }, [busca, consumables, f.consumable_id, deptoSel])

  const entradas = useMemo(() => {
    const t = q.trim().toLowerCase()
    return movements
      .filter((m) => m.tipo === 'entrada')
      .filter((m) => !deptoFiltro || m.departamento === deptoFiltro)
      .filter((m) => `${m.modelo} ${m.descripcion} ${m.departamento} ${m.persona} ${m.usuario} ${m.notas}`.toLowerCase().includes(t))
  }, [movements, q, deptoFiltro])

  const mover = (d) => setF({ ...f, cantidad: Math.max(1, (Number(f.cantidad) || 1) + d) })

  const submit = async (e) => {
    e.preventDefault()
    setMsg(null)
    setEnviando(true)
    try {
      const m = await api.addStock(Number(f.consumable_id), {
        cantidad: Number(f.cantidad), proveedor: f.proveedor, notas: f.notas })
      toast.ok(`Entrada registrada: ${m.cantidad} × ${m.modelo} (${m.departamento}). Stock actual: ${m.stock_actual}`)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setMsg(null), 4000)
      setF({ ...VACIO, proveedor: f.proveedor })
      setBusca('')
      onDone()
    } catch (ex) {
      setMsg({ ok: false, text: ex.message })
    } finally {
      setEnviando(false)
    }
  }

  const anular = async (m) => {
    if (!window.confirm(`¿Anular la entrada #${m.id}? Se descontará del stock.`)) return
    try {
      await api.anular(m.id)
      setErr('')
      onDone()
    } catch (ex) {
      setErr(ex.message)
    }
  }

  return (
    <div className={'split' + (panel ? '' : ' cerrado')}>
      <aside className="side">
        <div className="side-cab">
          <span className="side-titulo">Registrar entrada</span>
          <button type="button" className="side-btn" onClick={() => setPanel(!panel)}
            title={panel ? 'Ocultar panel' : 'Mostrar panel'}
            aria-label={panel ? 'Ocultar panel' : 'Mostrar panel'}>
            {panel ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
          </button>
        </div>
        <button type="button" className="side-rail" onClick={() => setPanel(true)}>Registrar entrada</button>
        <form className="side-cuerpo form-op" onSubmit={submit}>

          <label>Departamento
            <select value={deptoSel}
              onChange={(e) => { setDeptoSel(e.target.value); setF({ ...f, consumable_id: '' }) }}>
              <option value="">Todos</option>
              {deptos.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>

          <label>Consumible
            <input type="search" className="buscar-sel" placeholder="Filtrar la lista…" value={busca}
              onChange={(e) => setBusca(e.target.value)} />
            <select required value={f.consumable_id} onChange={set('consumable_id')}>
              <option value="">— Elige —</option>
              {opciones.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.departamento} · {c.modelo} · {c.descripcion} (stock {c.stock})
                </option>
              ))}
            </select>
          </label>
          {sel && <p className="hint">Stock actual: {sel.stock}</p>}

          <div className="field">
            <span className="lbl">Cantidad</span>
            <div className="stepper">
              <button type="button" aria-label="Restar uno" onClick={() => mover(-1)} disabled={Number(f.cantidad) <= 1}>−</button>
              <input type="number" aria-label="Cantidad" min="1" required value={f.cantidad} onChange={set('cantidad')} />
              <button type="button" aria-label="Sumar uno" onClick={() => mover(1)}>+</button>
            </div>
          </div>

          <label>Proveedor / factura
            <input value={f.proveedor} onChange={set('proveedor')} />
          </label>
          <label>Notas
            <input value={f.notas} onChange={set('notas')} placeholder="Opcional" />
          </label>

          <button className="btn" type="submit" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Registrar entrada'}
          </button>
          {msg && <div role="status" className={'alert ' + (msg.ok ? 'ok' : 'error')}>{msg.text}</div>}
        </form>
      </aside>

      <section className="card split-main">
        <div className="toolbar">
          <h2>Historial de entradas <span className="contador">{entradas.length}</span></h2>
          <div className="toolbar">
            <select className="filtro-sel" value={deptoFiltro} onChange={(e) => setDeptoFiltro(e.target.value)}>
              <option value="">Todos los departamentos</option>
              {deptos.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input className="search" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {err && <div className="alert error">{err}</div>}
        <div className="tabla-scroll">
          <table className="excel">
            <thead>
              <tr><th>Folio</th><th>Fecha</th><th>Departamento</th><th>Modelo</th><th>Descripción</th>
                <th className="num">Cant.</th><th>Proveedor / factura</th><th>Notas</th><th>Registró</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {entradas.map((m) => (
                <tr key={m.id} className={m.anulado ? 'muted' : ''}>
                  <td className="id">{m.id}</td>
                  <td>{m.fecha}</td>
                  <td><strong>{m.departamento}</strong></td>
                  <td>{m.modelo}</td>
                  <td>{m.descripcion}</td>
                  <td className="num"><strong>{m.cantidad}</strong></td>
                  <td>{m.persona}</td>
                  <td className="nota">{m.notas}</td>
                  <td>{m.usuario}</td>
                  <td>
                    {m.anulado
                      ? <span className="pill anulado">Anulado{m.anulado_por ? ` · ${m.anulado_por}` : ''}</span>
                      : <button className="link" onClick={() => anular(m)}>Anular</button>}
                  </td>
                </tr>
              ))}
              {entradas.length === 0 && <tr><td colSpan="10">Aún no hay entradas.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}