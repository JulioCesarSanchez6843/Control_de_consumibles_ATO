import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api'

const VACIO = { consumable_id: '', cantidad: 1, proveedor: '', notas: '' }

export default function Entradas({ consumables, movements, prefill, onDone }) {
  const [f, setF] = useState(VACIO)
  const [msg, setMsg] = useState(null)
  const [busca, setBusca] = useState('')
  const [err, setErr] = useState('')
  const [enviando, setEnviando] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    if (prefill) setF((p) => ({ ...p, consumable_id: prefill.consumable_id ?? '' }))
  }, [prefill])

  useEffect(() => () => clearTimeout(timer.current), [])

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const sel = consumables.find((c) => c.id === Number(f.consumable_id))

  const opciones = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!t) return consumables
    return consumables.filter((c) =>
      c.id === Number(f.consumable_id) || `${c.modelo} ${c.descripcion} ${c.marca}`.toLowerCase().includes(t))
  }, [busca, consumables, f.consumable_id])

  const entradas = useMemo(() => movements.filter((m) => m.tipo === 'entrada').slice(0, 10), [movements])

  const mover = (d) => setF({ ...f, cantidad: Math.max(1, (Number(f.cantidad) || 1) + d) })

  const submit = async (e) => {
    e.preventDefault()
    setMsg(null)
    setEnviando(true)
    try {
      const m = await api.addStock(Number(f.consumable_id), {
        cantidad: Number(f.cantidad), proveedor: f.proveedor, notas: f.notas })
      setMsg({ ok: true, text: `Entrada registrada: ${m.cantidad} × ${m.modelo}. Stock actual: ${m.stock_actual}` })
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
    <div className="grid2">
      <form className="card" onSubmit={submit}>
        <h2>Registrar entrada de proveedor</h2>

        <label>Consumible
          <input type="search" className="buscar-sel" placeholder="Filtrar la lista…" value={busca}
            onChange={(e) => setBusca(e.target.value)} />
          <select required value={f.consumable_id} onChange={set('consumable_id')}>
            <option value="">— Elige —</option>
            {opciones.map((c) => (
              <option key={c.id} value={c.id}>
                {c.modelo} · {c.descripcion} (stock {c.stock})
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

      <div className="card">
        <h2>Últimas entradas</h2>
        {err && <div className="alert error">{err}</div>}
        <table>
          <thead>
            <tr><th>Folio</th><th>Fecha</th><th>Modelo</th><th>Cant.</th><th>Proveedor / factura</th><th>Notas</th><th>Registró</th><th></th></tr>
          </thead>
          <tbody>
            {entradas.map((m) => (
              <tr key={m.id} className={m.anulado ? 'muted' : ''}>
                <td>{m.id}</td><td>{m.fecha}</td><td>{m.modelo}</td><td>{m.cantidad}</td>
                <td>{m.persona}</td><td>{m.notas}</td><td>{m.usuario}</td>
                <td>{m.anulado ? <em>anulado{m.anulado_por ? ` por ${m.anulado_por}` : ''}</em> : <button className="link" onClick={() => anular(m)}>Anular</button>}</td>
              </tr>
            ))}
            {entradas.length === 0 && <tr><td colSpan="8">Aún no hay entradas.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}