import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api'

const VACIO = { consumable_id: '', cantidad: 1, departamento: '', persona: '', notas: '' }

export default function Salidas({ consumables, departamentos, printers, movements, prefill, onDone }) {
  const [f, setF] = useState(VACIO)
  const [msg, setMsg] = useState(null)
  const [busca, setBusca] = useState('')
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const [enviando, setEnviando] = useState(false)
  const selRef = useRef(null)
  const timer = useRef(null)

  useEffect(() => {
    if (prefill) setF((p) => ({ ...p, consumable_id: prefill.consumable_id ?? '',
      departamento: prefill.departamento ?? '' }))
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
    return consumables.filter((c) => ids.has(c.id))
  }, [f.departamento, printers, consumables])

  const opciones = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!t) return consumables
    return consumables.filter((c) =>
      c.id === Number(f.consumable_id) || `${c.modelo} ${c.descripcion} ${c.marca}`.toLowerCase().includes(t))
  }, [busca, consumables, f.consumable_id])

  const salidas = useMemo(() => {
    const t = q.trim().toLowerCase()
    return movements
      .filter((m) => m.tipo === 'salida')
      .filter((m) => `${m.modelo} ${m.descripcion} ${m.departamento} ${m.persona} ${m.usuario} ${m.notas}`.toLowerCase().includes(t))
  }, [movements, q])

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
      setMsg({ ok: true, text: `Registrada la salida de ${m.cantidad} × ${m.modelo}. Stock actual: ${m.stock_actual}` })
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setMsg(null), 4000)
      setF({ ...VACIO, persona: f.persona })
      setBusca('')
      onDone()
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
    } catch (ex) {
      setErr(ex.message)
    }
  }

  return (
    <div className="grid2">
      <form className="card" onSubmit={submit}>
        <h2>Registrar salida</h2>

        <label>Departamento *
          <input list="deptos" value={f.departamento} onChange={set('departamento')}
            required placeholder="Ej. Servicio" />
          <datalist id="deptos">{departamentos.map((d) => <option key={d} value={d} />)}</datalist>
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

        <label>Consumible
          <input type="search" className="buscar-sel" placeholder="Filtrar la lista…" value={busca}
            onChange={(e) => setBusca(e.target.value)} />
          <select ref={selRef} required value={f.consumable_id} onChange={set('consumable_id')}>
            <option value="">— Elige —</option>
            {opciones.map((c) => (
              <option key={c.id} value={c.id}>
                {c.modelo} · {c.descripcion} (stock {c.stock})
              </option>
            ))}
          </select>
        </label>
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

        <button className="btn" type="submit" disabled={enviando || excede}>
          {enviando ? 'Guardando…' : 'Registrar salida'}
        </button>
        {msg && <div role="status" className={'alert ' + (msg.ok ? 'ok' : 'error')}>{msg.text}</div>}
      </form>

      <div className="card">
        <div className="toolbar">
          <h2>Bitácora de salidas</h2>
          <input className="search" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {err && <div className="alert error">{err}</div>}
        <table>
          <thead>
            <tr><th>Folio</th><th>Fecha</th><th>Modelo</th><th>Descripción</th><th>Cant.</th>
              <th>Departamento</th><th>Persona</th><th>Notas</th><th>Registró</th><th></th></tr>
          </thead>
          <tbody>
            {salidas.map((m) => (
              <tr key={m.id} className={m.anulado ? 'muted' : ''}>
                <td>{m.id}</td><td>{m.fecha}</td>
                <td>{m.modelo}</td><td>{m.descripcion}</td><td>{m.cantidad}</td>
                <td>{m.departamento}</td><td>{m.persona}</td><td>{m.notas}</td><td>{m.usuario}</td>
                <td>{m.anulado ? <em>anulado{m.anulado_por ? ` por ${m.anulado_por}` : ''}</em> : <button className="link" onClick={() => anular(m)}>Anular</button>}</td>
              </tr>
            ))}
            {salidas.length === 0 && <tr><td colSpan="10">Sin salidas.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}