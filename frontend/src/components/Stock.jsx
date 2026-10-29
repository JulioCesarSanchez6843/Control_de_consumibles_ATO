import { useState } from 'react'
import { api } from '../api'
import ConsumibleModal from './ConsumibleModal'

export default function Stock({ consumables, departamentos, onChange, onMover, onRecibir }) {
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [depto, setDepto] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [errMin, setErrMin] = useState('')

  const estado = (c) => (c.stock === 0 ? 'agotado' : c.stock <= c.stock_minimo ? 'bajo' : 'ok')
  const orden = { agotado: 0, bajo: 1, ok: 2 }

  const deDepto = consumables.filter((c) => !depto || c.departamento === depto)
  const bajos = deDepto.filter((c) => estado(c) === 'bajo').length
  const agotados = deDepto.filter((c) => estado(c) === 'agotado').length

  const lista = deDepto
    .filter((c) => filtro === 'todos' || estado(c) === filtro)
    .filter((c) => `${c.departamento} ${c.modelo} ${c.descripcion} ${c.marca} ${c.notas}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => orden[estado(a)] - orden[estado(b)] || a.modelo.localeCompare(b.modelo))

  const creado = () => {
    setMostrarForm(false)
    onChange()
  }

  const guardarDepto = async (c, valor) => {
    const v = valor.trim()
    if (!v) return
    try {
      await api.updateConsumable(c.id, { departamento: v })
      setErrMin('')
      onChange()
    } catch (ex) { setErrMin(ex.message) }
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

  return (
    <div className="card">
      <div className="toolbar">
        <h2>Inventario de consumibles</h2>
        <div className="toolbar">
          <select style={{ width: 'auto', margin: 0 }} value={depto} onChange={(e) => setDepto(e.target.value)}>
            <option value="">Todos los departamentos</option>
            {departamentos.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <input className="search" placeholder="Buscar modelo, tipo, marca…" value={q}
            onChange={(e) => setQ(e.target.value)} />
          <button className="btn" type="button" onClick={() => setMostrarForm(true)}>
            + Nuevo consumible
          </button>
        </div>
      </div>

      <div className="stats">
        {[['todos', 'Total', deDepto.length], ['bajo', 'Bajo', bajos], ['agotado', 'Agotado', agotados]].map(([k, l, n]) => (
          <button key={k} type="button" className={'stat ' + k + (filtro === k ? ' active' : '')}
            onClick={() => setFiltro(filtro === k ? 'todos' : k)}>
            <strong>{n}</strong><span>{l}</span>
          </button>
        ))}
      </div>

      {mostrarForm && <ConsumibleModal departamentos={departamentos} onClose={() => setMostrarForm(false)} onCreated={creado} />}
      <datalist id="deptos-stock">
        {departamentos.map((x) => <option key={x} value={x} />)}
      </datalist>

      {errMin && <div className="alert error">{errMin}</div>}

      <table>
        <thead>
          <tr><th>Departamento</th><th>Modelo</th><th>Descripción</th><th>Marca</th><th>Notas</th><th className="num">Stock</th>
            <th className="num">Mínimo</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {lista.map((c) => {
            const est = estado(c)
            return (
              <tr key={c.id} className={'fila ' + est}>
                <td>
                  {c.departamento || (
                    <input style={{ width: 150, margin: 0 }} list="deptos-stock" placeholder="Asignar…"
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                      onBlur={(e) => guardarDepto(c, e.target.value)} />
                  )}
                </td>
                <td>{c.modelo}</td><td>{c.descripcion}</td><td>{c.marca}</td><td>{c.notas}</td>
                <td className="num">
                  <strong>{c.stock}</strong>
                  <div className="barra">
                    <span className={est}
                      style={{ width: Math.min(100, Math.round((c.stock / Math.max(c.stock_minimo * 3, 1)) * 100)) + '%' }} />
                  </div>
                </td>
                <td className="num">
                  <input className="mini" type="number" min="0" defaultValue={c.stock_minimo}
                    key={c.id + '-' + c.stock_minimo}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                    onBlur={(e) => guardarMinimo(c, e.target.value)} />
                </td>
                <td><span className={'tag ' + est}>{est === 'agotado' ? 'Agotado' : est === 'bajo' ? 'Bajo' : 'OK'}</span></td>
                <td className="acciones">
                  <button className="link" disabled={c.stock === 0} onClick={() => onMover(c.id, c.departamento)}>Entregar</button>
                  <button className="link" onClick={() => onRecibir(c.id)}>+ Entrada</button>
                </td>
              </tr>
            )
          })}
          {lista.length === 0 && <tr><td colSpan="9">Sin resultados.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}