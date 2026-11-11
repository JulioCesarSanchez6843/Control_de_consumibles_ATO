import { useState } from 'react'
import { FileText, Trash2 } from 'lucide-react'
import { api } from '../api'
import { useToast } from './Toast'
import Paginador from './Paginador'
import useListaPaginada from '../useListaPaginada'

const fecha = (iso) => (iso ? iso.split('-').reverse().join('/') : '')

export default function Frecuentes({ onRequisicion, filas = 25 }) {
  const toast = useToast()
  const [sel, setSel] = useState([])
  const lista = useListaPaginada(api.frecuentes, { filas })
  const pag = lista.pag
  const elegidos = sel

  const alternar = (a) => setSel((actual) => (actual.some((x) => x.id === a.id) ? actual.filter((x) => x.id !== a.id) : [...actual, a]))

  const borrar = async (a) => {
    if (!window.confirm(`¿Quitar "${a.descripcion}" de los frecuentes?`)) return
    try {
      await api.deleteFrecuente(a.id)
      setSel((actual) => actual.filter((x) => x.id !== a.id))
      lista.recargar()
    } catch (ex) {
      toast.error(ex.message)
    }
  }

  const pasar = () => {
    onRequisicion(elegidos.map((a) => ({
      cantidad: String(a.cantidad),
      unidad: a.unidad,
      descripcion: a.descripcion,
    })))
  }

  return (
    <div className="card">
      <div className="toolbar">
        <div>
          <h2>Compras frecuentes</h2>
          <p className="subtitulo">Se llena solo al descargar requisiciones. {pag.cantidad} artículos</p>
        </div>
        <div className="filtros">
          <input className="search" placeholder="Buscar artículo o proveedor…" value={lista.texto}
            onChange={(e) => lista.setTexto(e.target.value)} />
          <button type="button" className="btn" disabled={elegidos.length === 0} onClick={pasar}>
            <FileText size={16} /> Pasar a requisición ({elegidos.length})
          </button>
        </div>
      </div>

      {lista.error && <div className="alert error">{lista.error}</div>}

      <table>
        <thead>
          <tr><th></th><th>Artículo</th><th>Cantidad habitual</th><th>Proveedor</th><th>Veces</th><th>Última compra</th><th></th></tr>
        </thead>
        <tbody>
          {pag.items.map((a) => (
            <tr key={a.id}>
              <td>
                <input type="checkbox" checked={sel.some((x) => x.id === a.id)} onChange={() => alternar(a)}
                  aria-label={'Elegir ' + a.descripcion} />
              </td>
              <td><strong>{a.descripcion}</strong></td>
              <td className="nowrap">{a.cantidad} {a.unidad}</td>
              <td>{a.proveedor || '—'}</td>
              <td>{a.veces}</td>
              <td className="nowrap">{fecha(a.ultima_compra)}</td>
              <td>
                <button type="button" className="btn secondary" title="Quitar" aria-label="Quitar" onClick={() => borrar(a)}>
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
          {!lista.cargando && pag.items.length === 0 && (
            <tr><td colSpan="7" className="vacio">Aún no hay compras registradas.</td></tr>
          )}
        </tbody>
      </table>
      <Paginador p={pag} />
    </div>
  )
}