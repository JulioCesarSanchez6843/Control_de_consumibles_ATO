import { useState } from 'react'
import { api } from '../api'

const NUEVO = { modelo: '', descripcion: '', marca: '', stock: 0, stock_minimo: 1 }

export default function Stock({ consumables, onChange, onMover, onRecibir }) {
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [nuevo, setNuevo] = useState(NUEVO)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [err, setErr] = useState('')
  const [errMin, setErrMin] = useState('')

  const estado = (c) => (c.stock === 0 ? 'agotado' : c.stock <= c.stock_minimo ? 'bajo' : 'ok')
  const orden = { agotado: 0, bajo: 1, ok: 2 }

  const bajos = consumables.filter((c) => estado(c) === 'bajo').length
  const agotados = consumables.filter((c) => estado(c) === 'agotado').length

  const lista = consumables
    .filter((c) => filtro === 'todos' || estado(c) === filtro)
    .filter((c) => `${c.modelo} ${c.descripcion} ${c.marca} ${c.notas}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => orden[estado(a)] - orden[estado(b)] || a.modelo.localeCompare(b.modelo))

  const agregar = async (e) => {
    e.preventDefault()
    try {
      await api.addConsumable({ ...nuevo, stock: Number(nuevo.stock), stock_minimo: Number(nuevo.stock_minimo) })
      setNuevo(NUEVO); setErr(''); setMostrarForm(false); onChange()
    } catch (ex) { setErr(ex.message) }
  }

  const guardarMinimo = async (c, valor) => {
    const n = Number(valor)
    if (valor === '' || Number.isNaN(n) || n < 0 || n === c.stock_minimo) return
    try {
      await api.updateConsumable(c.id, { stock_minimo: n })
      setErrMin('')
      onChange()
    } catch (ex) { setErrMin(ex.message) }
  }

  const set = (k) => (e) => setNuevo({ ...nuevo, [k]: e.target.value })

  return (
    <div className="card">
      <div className="toolbar">
        <h2>Inventario de consumibles</h2>
        <div className="toolbar">
          <input className="search" placeholder="Buscar modelo, tipo, marca…" value={q}
            onChange={(e) => setQ(e.target.value)} />
          <button className="btn" type="button" onClick={() => setMostrarForm(!mostrarForm)}>
            {mostrarForm ? 'Cerrar' : '+ Nuevo consumible'}
          </button>
        </div>
      </div>

      <div className="stats">
        {[['todos', 'Total', consumables.length], ['bajo', 'Bajo', bajos], ['agotado', 'Agotado', agotados]].map(([k, l, n]) => (
          <button key={k} type="button" className={'stat ' + k + (filtro === k ? ' active' : '')}
            onClick={() => setFiltro(filtro === k ? 'todos' : k)}>
            <strong>{n}</strong><span>{l}</span>
          </button>
        ))}
      </div>

      {mostrarForm && (
        <div className="panel">
          <form className="inline-form" onSubmit={agregar}>
            <h3>Agregar consumible nuevo</h3>
            <input required placeholder="Modelo (ej. TN850)" value={nuevo.modelo} onChange={set('modelo')} />
            <input placeholder="Descripción (Toner…)" value={nuevo.descripcion} onChange={set('descripcion')} />
            <input placeholder="Marca" value={nuevo.marca} onChange={set('marca')} />
            <input type="number" min="0" title="Stock inicial" value={nuevo.stock} onChange={set('stock')} />
            <input type="number" min="0" title="Stock mínimo" value={nuevo.stock_minimo} onChange={set('stock_minimo')} />
            <button className="btn" type="submit">Agregar</button>
            {err && <div className="alert error">{err}</div>}
          </form>
        </div>
      )}

      {errMin && <div className="alert error">{errMin}</div>}

      <table>
        <thead>
          <tr><th>Modelo</th><th>Descripción</th><th>Marca</th><th>Notas</th><th className="num">Stock</th>
            <th className="num">Mínimo</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {lista.map((c) => {
            const est = estado(c)
            return (
              <tr key={c.id} className={'fila ' + est}>
                <td>{c.modelo}</td><td>{c.descripcion}</td><td>{c.marca}</td><td>{c.notas}</td>
                <td className="num"><strong>{c.stock}</strong></td>
                <td className="num">
                  <input className="mini" type="number" min="0" defaultValue={c.stock_minimo}
                    key={c.id + '-' + c.stock_minimo}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                    onBlur={(e) => guardarMinimo(c, e.target.value)} />
                </td>
                <td><span className={'tag ' + est}>{est === 'agotado' ? 'Agotado' : est === 'bajo' ? 'Bajo' : 'OK'}</span></td>
                <td className="acciones">
                  <button className="link" disabled={c.stock === 0} onClick={() => onMover(c.id, '')}>Entregar</button>
                  <button className="link" onClick={() => onRecibir(c.id)}>+ Entrada</button>
                </td>
              </tr>
            )
          })}
          {lista.length === 0 && <tr><td colSpan="8">Sin resultados.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}