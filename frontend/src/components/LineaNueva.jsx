import { useState } from 'react'
import { api } from '../api'

export default function LineaNueva({ impresoraId, departamento, consumables, toners, onGuardado, onError }) {
  const [abierto, setAbierto] = useState(false)
  const [id, setId] = useState('')

  const agregar = async () => {
    if (!id) return
    try {
      const [tipo, valor] = id.split(':')
      await api.addPrinterLine(impresoraId, tipo === 't' ? { toner_id: Number(valor) } : { consumable_id: Number(valor) })
      setId(''); setAbierto(false); onError(''); onGuardado()
    } catch (ex) { onError(ex.message) }
  }

  if (!abierto) {
    return <button className="link" type="button" onClick={() => setAbierto(true)}>+ Consumible</button>
  }

  return (
    <div className="linea-nueva">
      <select value={id} onChange={(e) => setId(e.target.value)}>
        <option value="">Elegir…</option>
        <optgroup label="Tóners">
          {toners.map((t) => <option key={'t' + t.id} value={'t:' + t.id}>{t.modelo}</option>)}
        </optgroup>
        <optgroup label="Otros consumibles del departamento">
          {consumables
            .filter((c) => c.departamento.trim().toLowerCase() === departamento.trim().toLowerCase()
              && !toners.some((t) => t.modelo.toLowerCase() === c.modelo.toLowerCase()))
            .map((c) => (
              <option key={c.id} value={'c:' + c.id}>{c.modelo}{c.descripcion ? ` · ${c.descripcion}` : ''}</option>
            ))}
        </optgroup>
      </select>
      <button className="btn" type="button" onClick={agregar}>Agregar</button>
      <button className="link" type="button" onClick={() => setAbierto(false)}>Cancelar</button>
    </div>
  )
}