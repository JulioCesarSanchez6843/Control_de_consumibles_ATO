import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import usePersistido from '../usePersistido'
import { useToast } from './Toast'
import Combobox from './Combobox'
import Paginador from './Paginador'
import useListaPaginada from '../useListaPaginada'

const VACIO = { consumable_id: '', cantidad: 1, departamento: '', persona: '', notas: '' }

export default function Salidas({ consumables, departamentos, printers, prefill, onDone, filas = 25 }) {
  const [f, setF] = useState(VACIO)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [panel, setPanel] = usePersistido('panel-salidas', false)
  const toast = useToast()
  const selRef = useRef(null)
  const timer = useRef(null)

  useEffect(() => {
    if (prefill) {
      setPanel(true)
      setF((p) => ({ ...p, consumable_id: prefill.consumable_id ?? '',
        departamento: prefill.departamento ?? '' }))
    }
  }, [prefill])

  useEffect(() => () => clearTimeout(timer.current), [])

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const sel = consumables.find((c) => c.id === Number(f.consumable_id))

  const sugeridos = useMemo(() => {
    const d = f.departamento.trim().toLowerCase()
    if (!d) return []
    const ids = new Set()
    printers.forEach((p) => {
      if (p.departamento.trim().toLowerCase() === d) {
        p.consumibles.forEach((l) => { if (l.consumable_id) ids.add(l.consumable_id) })
      }
    })
    return consumables.filter((c) => ids.has(c.id) && c.departamento.trim().toLowerCase() === d)
  }, [f.departamento, printers, consumables])

  const opciones = useMemo(() => {
    const d = f.departamento.trim().toLowerCase()
    return consumables
      .filter((c) => c.departamento.trim().toLowerCase() === d)
      .map((c) => ({
        value: c.id,
        label: `${c.modelo} · ${c.descripcion}`,
        sub: `Stock ${c.stock}`,
        bajo: c.stock <= c.stock_minimo,
        buscar: `${c.modelo} ${c.descripcion} ${c.marca}`,
      }))
  }, [consumables, f.departamento])

  const lista = useListaPaginada(api.movements, { base: { tipo: 'salida' }, filas, claves: ['depto'] })
  const pag = lista.pag

  const cantidad = Number(f.cantidad)
  const excede = !!sel && cantidad > sel.stock
  const mover = (d) => setF({ ...f, cantidad: Math.max(1, (Number(f.cantidad) || 1) + d) })

  const submit = async (e) => {
    e.preventDefault()
    if (excede) return
    setMsg(null)
    setEnviando(true)
    try {
      const m = await api.addMovement({ ...f, consumable_id: Number(f.consumable_id), cantidad: Number(f.cantidad) })
      toast.ok(`Salida registrada: ${m.cantidad} × ${m.modelo} (${m.departamento}). Stock actual: ${m.stock_actual}`)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setMsg(null), 4000)
      setF({ ...VACIO, persona: f.persona })
      onDone()
      lista.recargar()
      if (selRef.current) selRef.current.focus()
    } catch (ex) {
      setMsg({ ok: false, text: ex.message })
    } finally {
      setEnviando(false)
    }
  }

  const anular = async (m) => {
    if (!window.confirm(`¿Anular la salida #${m.id}? Se devolverá el stock.`)) return
    try {
      await api.anular(m.id)
      setErr('')
      onDone()
      lista.recargar()
    } catch (ex) {
      setErr(ex.message)
    }
  }

  return (
    <div className={'split' + (panel ? '' : ' cerrado')}>
      <aside className="side">
        <div className="side-cab">
          <span className="side-titulo">Registrar salida</span>
          <button type="button" className="side-btn" onClick={() => setPanel(!panel)}
            title={panel ? 'Ocultar panel' : 'Mostrar panel'}
            aria-label={panel ? 'Ocultar panel' : 'Mostrar panel'}>
            {panel ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>
        </div>
        <button type="button" className="side-rail" onClick={() => setPanel(true)}>Registrar salida</button>
        <form className="side-cuerpo form-op" onSubmit={submit}>

          <label>Departamento *
            <select required value={f.departamento}
              onChange={(e) => setF({ ...f, departamento: e.target.value, consumable_id: '' })}>
              <option value="">— Elige —</option>
              {departamentos.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>

          {sugeridos.length > 0 && (
            <div className="chips">
              <span className="hint">Consumibles de las impresoras de este departamento:</span>
              {sugeridos.map((c) => (
                <button type="button" key={c.id} title={`${c.modelo} · ${c.descripcion}`}
                  className={'chip' + (Number(f.consumable_id) === c.id ? ' active' : '') + (c.stock <= c.stock_minimo ? ' low' : '')}
                  onClick={() => setF({ ...f, consumable_id: c.id })}>
                  {c.modelo} · {c.stock}
                </button>
              ))}
            </div>
          )}

          <div className="field">
            <span className="lbl">Consumible *</span>
            <Combobox inputRef={selRef} opciones={opciones} value={f.consumable_id} disabled={!f.departamento}
              placeholder={f.departamento ? 'Busca o elige un consumible…' : 'Elige primero el departamento'}
              onChange={(v) => setF({ ...f, consumable_id: v })} />
          </div>

          {sel && <p className={sel.stock <= sel.stock_minimo ? 'hint warn' : 'hint'}>Stock actual: {sel.stock}</p>}

          <div className="field">
            <span className="lbl">Cantidad</span>
            <div className="stepper">
              <button type="button" aria-label="Restar uno" onClick={() => mover(-1)} disabled={cantidad <= 1}>−</button>
              <input type="number" aria-label="Cantidad" min="1" required value={f.cantidad}
                max={sel ? sel.stock : undefined} onChange={set('cantidad')} />
              <button type="button" aria-label="Sumar uno" onClick={() => mover(1)}>+</button>
            </div>
            {excede && <p className="hint warn">Solo hay {sel.stock} en stock</p>}
          </div>

          <label>Quién recibe
            <input value={f.persona} onChange={set('persona')} />
          </label>
          <label>Notas
            <input value={f.notas} onChange={set('notas')} placeholder="Opcional" />
          </label>

          <button className="btn" type="submit" disabled={enviando || excede || !f.consumable_id}>
            {enviando ? 'Guardando…' : 'Registrar salida'}
          </button>
          {msg && <div role="status" className={'alert ' + (msg.ok ? 'ok' : 'error')}>{msg.text}</div>}
        </form>
      </aside>

      <section className="card split-main">
        <div className="toolbar">
          <h2>Bitácora de salidas <span className="contador">{pag.cantidad}</span></h2>
          <div className="toolbar">
            <select className="filtro-sel" value={lista.filtros.depto} onChange={(e) => lista.setFiltro('depto', e.target.value)}>
              <option value="">Todos los departamentos</option>
              {departamentos.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input className="search" placeholder="Buscar…" value={lista.texto} onChange={(e) => lista.setTexto(e.target.value)} />
          </div>
        </div>
        {(err || lista.error) && <div className="alert error">{err || lista.error}</div>}
        <div className="tabla-scroll">
          <table className="excel">
            <thead>
              <tr><th>Folio</th><th>Fecha</th><th>Departamento</th><th>Modelo</th><th>Descripción</th>
                <th className="num">Cant.</th><th>Persona</th><th>Notas</th><th>Registró</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {pag.items.map((m) => (
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
              {!lista.cargando && pag.items.length === 0 && <tr><td colSpan="10">Sin salidas.</td></tr>}
            </tbody>
          </table>
        </div>
        <Paginador p={pag} />
      </section>
    </div>
  )
}