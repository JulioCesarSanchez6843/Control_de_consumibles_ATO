import { useState } from 'react'
import { api } from '../api'

export default function LineaNueva({ impresoraId, consumables, onGuardado, onError }) {
  const [abierto, setAbierto] = useState(false)
  const [id, setId] = useState('')

  const agregar = async () => {
    if (!id) return
    try {
      await api.addPrinterLine(impresoraId, { consumable_id: Number(id) })
      setId(''); setAbierto(false); onError(''); onGuardado()
    } catch (ex) { onError(ex.message) }
  }

  if (!abierto) {
    return <button className="link" type="button" onClick={() => setAbierto(true)}>+ Consumible</button>
  }

  return (
    <div className="linea-nueva">
      <select value={id} onChange={(e) => setId(e.target.value)}>
        <option value="">Elegir consumible…</option>
        {consumables.map((c) => (
          <option key={c.id} value={c.id}>{c.modelo}{c.descripcion ? ` · ${c.descripcion}` : ''}</option>
        ))}
      </select>
      <button className="btn" type="button" onClick={agregar}>Agregar</button>
      <button className="link" type="button" onClick={() => setAbierto(false)}>Cancelar</button>
    </div>
  )
}