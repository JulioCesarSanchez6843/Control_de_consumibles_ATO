import { useState } from 'react'

export default function Impresoras({ printers, onEntregar }) {
  const [q, setQ] = useState('')
  const lista = printers.filter((p) =>
    `${p.marca} ${p.modelo} ${p.departamento} ${p.tipo}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="card">
      <div className="toolbar">
        <h2>Impresoras</h2>
        <input className="search" placeholder="Buscar por depto., marca, modelo…" value={q}
          onChange={(e) => setQ(e.target.value)} />
      </div>
      <table>
        <thead><tr><th>Departamento</th><th>Marca</th><th>Modelo</th><th>Tipo</th><th>Consumibles</th></tr></thead>
        <tbody>
          {lista.map((p) => (
            <tr key={p.id}>
              <td>{p.departamento}</td><td>{p.marca}</td><td>{p.modelo}</td><td>{p.tipo}</td>
              <td>
                {p.consumibles.length === 0 && <span className="muted">—</span>}
                {p.consumibles.map((l) => (
                  <div key={l.id} className="line">
                    {l.tipo_consumible} {l.pieza && <strong>{l.pieza}</strong>}
                    {l.consumable_id
                      ? <> <span className="hint">(stock {l.stock_actual})</span>{' '}
                          <button className="link" onClick={() => onEntregar(l.consumable_id, p.departamento)}>Entregar</button></>
                      : l.pieza && <span className="hint"> (no está en stock)</span>}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
