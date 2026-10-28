import { useState } from 'react'
import { api } from '../api'
import ImpresoraForm from './ImpresoraForm'
import LineaNueva from './LineaNueva'

export default function Impresoras({ printers, consumables, departamentos, onEntregar, onChange }) {
  const [q, setQ] = useState('')
  const [form, setForm] = useState(null)
  const [err, setErr] = useState('')

  const recargar = () => { setForm(null); setErr(''); onChange() }

  const borrar = async (p) => {
    if (!window.confirm(`¿Eliminar la impresora ${p.marca} ${p.modelo} de ${p.departamento}?`)) return
    try { await api.deletePrinter(p.id); setErr(''); onChange() } catch (ex) { setErr(ex.message) }
  }

  const quitarLinea = async (id) => {
    try { await api.deletePrinterLine(id); setErr(''); onChange() } catch (ex) { setErr(ex.message) }
  }
  const lista = printers.filter((p) =>
    `${p.marca} ${p.modelo} ${p.departamento} ${p.tipo}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="card">
      <div className="toolbar">
        <h2>Impresoras</h2>
          <div className="toolbar">
          <input className="search" placeholder="Buscar por depto., marca, modelo…" value={q}
            onChange={(e) => setQ(e.target.value)} />
          <button className="btn" type="button" onClick={() => setForm(form ? null : {})}>
            {form ? 'Cerrar' : '+ Nueva impresora'}
          </button>
        </div>
      </div>

      {form && (
        <ImpresoraForm key={form.id || 'nueva'} inicial={form} departamentos={departamentos}
          onGuardado={recargar} onCancelar={() => setForm(null)} />
      )}
      {err && <div className="alert error">{err}</div>}
      <table>
        <thead><tr><th>Departamento</th><th>Marca</th><th>Modelo</th><th>Tipo</th><th>Consumibles</th><th>Acciones</th></tr></thead>
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
                    {' '}<button className="link" onClick={() => quitarLinea(l.id)}>Quitar</button>
                  </div>
                ))}
                <LineaNueva impresoraId={p.id} consumables={consumables} onGuardado={onChange} onError={setErr} />
              </td>
              <td className="acciones">
                <button className="link" onClick={() => setForm(p)}>Editar</button>
                <button className="link" onClick={() => borrar(p)}>Eliminar</button>
              </td>
            </tr>
          ))}
          {lista.length === 0 && <tr><td colSpan="6">Sin impresoras. Usa "+ Nueva impresora".</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
