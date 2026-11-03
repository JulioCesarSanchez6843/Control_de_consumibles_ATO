import { useEffect, useMemo, useState } from 'react'
import { Check, ExternalLink, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../api'
import { useToast } from './Toast'
import PendienteModal from './PendienteModal'

const dinero = (n) => '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const importe = (n) => (n.costo == null ? 0 : n.cantidad * n.costo)

const idsEnRequisicion = (usuario) => {
  try {
    const f = JSON.parse(window.localStorage.getItem('requisicion:' + usuario.username))
    const lineas = f && Array.isArray(f.lineas) ? f.lineas : []
    return lineas.map((l) => l.notaId).filter(Boolean)
  } catch {
    return []
  }
}

export default function PendientesCompra({ usuario, onRequisicion }) {
  const toast = useToast()
  const [notas, setNotas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(null)
  const [sel, setSel] = useState([])
  const [enReq] = useState(() => idsEnRequisicion(usuario))

  useEffect(() => {
    api.notasCompra()
      .then(setNotas)
      .catch((ex) => toast.error(ex.message))
      .finally(() => setCargando(false))
  }, [])

  const lista = useMemo(() => [...notas].sort((a, b) => a.id - b.id), [notas])
  const seleccionables = lista.filter((n) => !enReq.includes(n.id))
  const elegidos = lista.filter((n) => sel.includes(n.id) && !enReq.includes(n.id))
  const todos = seleccionables.length > 0 && elegidos.length === seleccionables.length
  const totalLista = lista.reduce((s, n) => s + importe(n), 0)
  const totalElegido = elegidos.reduce((s, n) => s + importe(n), 0)

  const alternar = (id) => setSel((actual) => (actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id]))

  const alternarTodos = () => setSel(todos ? [] : seleccionables.map((n) => n.id))

  const guardar = async (f, seguir) => {
    if (modal && modal.nota) {
      const n = await api.updateNotaCompra(modal.nota.id, f)
      setNotas((actual) => actual.map((x) => (x.id === n.id ? n : x)))
      toast.ok('Artículo actualizado')
    } else {
      const nueva = await api.addNotaCompra(f)
      setNotas((actual) => [...actual, nueva])
      toast.ok('Agregado al checklist')
    }
    if (!seguir) setModal(null)
  }

  const borrar = async (n) => {
    if (!window.confirm(`¿Quitar "${n.item}" del checklist?`)) return
    try {
      await api.deleteNotaCompra(n.id)
      setNotas((actual) => actual.filter((x) => x.id !== n.id))
      setSel((actual) => actual.filter((x) => x !== n.id))
    } catch (ex) {
      toast.error(ex.message)
    }
  }

  const pasar = () => {
    onRequisicion(elegidos.map((n) => ({
      notaId: n.id,
      cantidad: String(n.cantidad),
      unidad: n.unidad,
      descripcion: (n.descripcion ? `${n.item} - ${n.descripcion}` : n.item).slice(0, 300),
      precio: n.costo == null ? '' : String(n.costo),
    })))
  }

  return (
    <div className="chk-pagina">
      <div className="toolbar">
        <h2>Checklist de compras</h2>
        <div className="toolbar">
          <button type="button" className="btn secondary" onClick={() => setModal({ nota: null })}>
            <Plus size={16} /> Agregar
          </button>
          <button type="button" className="btn" disabled={elegidos.length === 0} onClick={pasar}>
            <FileText size={16} /> Pasar a requisición ({elegidos.length})
          </button>
        </div>
      </div>

      <section className="chk-libreta">
        <div className="chk-espiral" aria-hidden="true" />
        <div className="chk-papel">
          <header className="chk-cabecera">
            <div>
              <h3 className="chk-titulo">Por comprar</h3>
              <p className="chk-subtitulo">
                Marca lo que irá en la requisición. Se quitará de esta lista cuando descargues la requisición
                y la marques como completa.
              </p>
            </div>
            {seleccionables.length > 0 && (
              <button type="button" className="link" onClick={alternarTodos}>
                {todos ? 'Quitar selección' : 'Seleccionar todo'}
              </button>
            )}
          </header>

          {cargando ? (
            <p className="vacio">Cargando…</p>
          ) : lista.length === 0 ? (
            <div className="chk-vacio">
              <p>Aún no hay nada anotado.</p>
              <button type="button" className="btn" onClick={() => setModal({ nota: null })}>
                <Plus size={16} /> Agregar el primero
              </button>
            </div>
          ) : (
            <ul className="chk-lista">
              {lista.map((n) => {
                const ligado = enReq.includes(n.id)
                const marcado = sel.includes(n.id) && !ligado
                return (
                  <li key={n.id} className={'chk-item' + (marcado ? ' marcado' : '') + (ligado ? ' ligado' : '')}>
                    <button type="button" role="checkbox" aria-checked={marcado} disabled={ligado}
                      className="chk-caja" title={ligado ? 'Ya está en la requisición' : 'Incluir en la requisición'}
                      aria-label={(marcado ? 'Quitar de la requisición: ' : 'Incluir en la requisición: ') + n.item}
                      onClick={() => alternar(n.id)}>
                      <Check size={20} strokeWidth={3} />
                    </button>
                    <div className="chk-cuerpo">
                      <span className="chk-nombre">{n.item}</span>
                      <div className="chk-datos">
                        <span className="chk-dato">{n.cantidad} {n.unidad}</span>
                        {n.costo != null && <span className="chk-dato">{dinero(n.costo)} c/u</span>}
                        {n.costo != null && <span className="chk-dato fuerte">{dinero(importe(n))}</span>}
                        {ligado && <span className="chk-dato req"><FileText size={12} /> En la requisición</span>}
                        {n.link && (
                          <a className="link" href={n.link} target="_blank" rel="noreferrer noopener">
                            Ver enlace <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                      {n.descripcion && <span className="chk-desc">{n.descripcion}</span>}
                    </div>
                    <div className="chk-acciones">
                      <button type="button" className="chk-icono" title="Editar" aria-label="Editar"
                        onClick={() => setModal({ nota: n })}>
                        <Pencil size={16} />
                      </button>
                      <button type="button" className="chk-icono peligro" title="Quitar" aria-label="Quitar"
                        onClick={() => borrar(n)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {lista.length > 0 && (
            <footer className="chk-pie">
              <div className="chk-nota">
                <div><span>Seleccionado</span><span>{dinero(totalElegido)}</span></div>
                <div className="total"><span>Total pendiente</span><span>{dinero(totalLista)}</span></div>
              </div>
              <p className="chk-pie-hint">Importes estimados, sin IVA.</p>
            </footer>
          )}
        </div>
      </section>

      {modal && <PendienteModal nota={modal.nota} onClose={() => setModal(null)} onGuardar={guardar} />}
    </div>
  )
}