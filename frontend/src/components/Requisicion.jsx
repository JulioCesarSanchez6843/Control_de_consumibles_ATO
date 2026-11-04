import { useEffect, useRef, useState } from 'react'
import { Download, Eraser, Plus, Trash2 } from 'lucide-react'
import { api } from '../api'
import usePersistido from '../usePersistido'
import { useToast } from './Toast'

const CATEGORIAS = [
  'ESTETICA AUTOMOTRIZ', 'PAPELERIA', 'CONSUMIBLES', 'MATERIAL DE LIMPIEZA', 'IMPRESOS', 'PUBLICIDAD',
  'REFACCIONES', 'SERVICIO', 'ESTEREOS Y PELICULAS', 'H Y P', 'SEGURIDAD', 'EQUIPO DE COMPUTO', 'EVENTOS',
]
const UNIDADES = ['PIEZA', 'CAJA', 'PAQUETE', 'JUEGO', 'LITRO', 'KILO', 'METRO', 'SERVICIO']
const EMPRESA = 'AUTOMOTRIZ TOLLOCAN S.A. DE C.V.'
const DOMICILIO = 'PASEO TOLLOCAN KM 4.8 COL SAN JERONIMO CHICAHUALCO, METEPEC, ESTADO DE MEXICO 52170 RFC : 860625BI5'
const MAX_LINEAS = 13
const ANCHO = 820
const CERO = '$0.00'

const dos = (n) => String(n).padStart(2, '0')

const hoy = () => {
  const d = new Date()
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
}

const linea = () => ({ cantidad: '1', unidad: 'PIEZA', descripcion: '' })

const vacio = (usuario) => ({
  folio: '',
  departamento: '',
  solicitante: usuario.nombre || usuario.username || '',
  fechaSolicitud: hoy(),
  fechaNecesita: '',
  categorias: [],
  presupuesto: '',
  proveedor: '',
  lineas: [linea()],
  observaciones: '',
})

const fecha = (iso) => (iso ? iso.split('-').reverse().join('/') : '')

function Celda({ c, r, clase = '', children }) {
  return (
    <div className={'rh ' + clase} style={{ gridColumn: c, gridRow: r }}>
      {children}
    </div>
  )
}

export default function Requisicion({ usuario, departamentos, prefill, onUsado }) {
  const toast = useToast()
  const [f, setF] = usePersistido('requisicion:' + usuario.username, vacio(usuario))
  const lienzo = useRef(null)
  const hoja = useRef(null)
  const [medidas, setMedidas] = useState({ escala: 1, alto: 0 })
  const [generando, setGenerando] = useState(false)
  const [completar, setCompletar] = useState(true)

  useEffect(() => {
    if (!prefill || prefill.length === 0) return
    const usadas = f.lineas.filter((l) => l.descripcion.trim())
    const ya = usadas.map((l) => l.notaId).filter(Boolean)
    const porAgregar = prefill.filter((p) => !ya.includes(p.notaId))
    const nuevas = porAgregar.slice(0, Math.max(0, MAX_LINEAS - usadas.length))
    const omitidas = porAgregar.length - nuevas.length
    const lineas = [...usadas, ...nuevas]
    setF({ ...f, lineas: lineas.length ? lineas : [linea()] })
    if (omitidas > 0) {
      toast.error(`La requisición admite ${MAX_LINEAS} artículos; quedaron fuera ${omitidas}`)
    } else if (nuevas.length > 0) {
      toast.ok(`${nuevas.length} artículo(s) agregados a la requisición`)
    }
    onUsado()
  }, [prefill])

  useEffect(() => {
    const medir = () => {
      if (!lienzo.current || !hoja.current) return
      const escala = Math.min(1, lienzo.current.clientWidth / ANCHO)
      const alto = hoja.current.offsetHeight * escala
      setMedidas((m) => (m.escala === escala && m.alto === alto ? m : { escala, alto }))
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(lienzo.current)
    ro.observe(hoja.current)
    return () => ro.disconnect()
  }, [])

  const set = (campo) => (e) => setF({ ...f, [campo]: e.target.value })

  const setLinea = (i, campo, valor) =>
    setF({ ...f, lineas: f.lineas.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)) })

  const agregar = () => {
    if (f.lineas.length < MAX_LINEAS) setF({ ...f, lineas: [...f.lineas, linea()] })
  }

  const quitar = (i) => setF({ ...f, lineas: f.lineas.filter((_, j) => j !== i) })

  const alternar = (nombre) =>
    setF({
      ...f,
      categorias: f.categorias.includes(nombre)
        ? f.categorias.filter((c) => c !== nombre)
        : [...f.categorias, nombre],
    })

  const limpiar = () => {
    if (!window.confirm('¿Limpiar toda la requisición?')) return
    setF(vacio(usuario))
  }

  const faltan = []
  if (!f.departamento.trim()) faltan.push('departamento solicitante')
  if (!f.solicitante.trim()) faltan.push('solicitado por')
  if (!f.fechaSolicitud) faltan.push('fecha de solicitud')
  if (!f.lineas.some((l) => l.descripcion.trim())) faltan.push('al menos un artículo con descripción')

  const ligadas = f.lineas.map((l) => l.notaId).filter(Boolean)

  const completarPendientes = async () => {
    const resultados = await Promise.allSettled(ligadas.map((id) => api.deleteNotaCompra(id, 'requisicion')))
    const quitadas = resultados.filter((r) => r.status === 'fulfilled').length
    setF((actual) => ({ ...actual, lineas: actual.lineas.map(({ notaId, ...resto }) => resto) }))
    toast.ok(`${quitadas} artículo(s) quitados del checklist de pendientes`)
  }

  const descargar = async () => {
    if (faltan.length) {
      toast.error('Falta: ' + faltan.join(', '))
      return
    }
    setGenerando(true)
    try {
      const { blob, nombre } = await api.requisicionExcel(f)
      const url = URL.createObjectURL(blob)
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = nombre
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
      URL.revokeObjectURL(url)
      toast.ok('Excel generado: ' + nombre)
      if (completar && ligadas.length > 0) await completarPendientes()
    } catch (ex) {
      toast.error(ex.message)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="req">
      <section className="card req-form">
        <div className="toolbar">
          <h2>Requisición de compra</h2>
        </div>

        <h3 className="req-sub">Datos generales</h3>
        <div className="fila-2">
          <label>Folio
            <input value={f.folio} onChange={set('folio')} placeholder="Ej. SIS-2026-0001" />
          </label>
          <label>Fecha de solicitud *
            <input type="date" value={f.fechaSolicitud} onChange={set('fechaSolicitud')} />
          </label>
        </div>
        <div className="fila-2">
          <label>Departamento solicitante *
            <input list="req-deptos" value={f.departamento} onChange={set('departamento')} />
          </label>
          <label>Solicitado por *
            <input value={f.solicitante} onChange={set('solicitante')} />
          </label>
        </div>
        <datalist id="req-deptos">
          {(departamentos || []).map((d) => <option key={d} value={d} />)}
        </datalist>
        <div className="fila-2">
          <label>Fecha en que se necesita <span className="opc">(opcional)</span>
            <input type="date" value={f.fechaNecesita} onChange={set('fechaNecesita')} />
          </label>
          <label>Presupuesto autorizado por consejo <span className="opc">(opcional)</span>
            <select value={f.presupuesto} onChange={set('presupuesto')}>
              <option value="">—</option>
              <option value="SÍ">Sí</option>
              <option value="NO">No</option>
            </select>
          </label>
        </div>

        <h3 className="req-sub">Tipo de compra</h3>
        <div className="req-chips">
          {CATEGORIAS.map((c) => (
            <button type="button" key={c} aria-pressed={f.categorias.includes(c)}
              className={'chip-op' + (f.categorias.includes(c) ? ' activo' : '')}
              onClick={() => alternar(c)}>
              {c}
            </button>
          ))}
        </div>
        <label>Proveedor sugerido <span className="opc">(opcional)</span>
          <input value={f.proveedor} onChange={set('proveedor')} />
        </label>

        <h3 className="req-sub">Artículos <span className="contador">{f.lineas.length}/{MAX_LINEAS}</span></h3>
        {f.lineas.map((l, i) => (
          <div className="req-linea" key={i}>
            <label>Cantidad
              <input type="number" min="0" step="any" value={l.cantidad}
                onChange={(e) => setLinea(i, 'cantidad', e.target.value)} />
            </label>
            <label>Unidad
              <input list="req-unidades" value={l.unidad}
                onChange={(e) => setLinea(i, 'unidad', e.target.value)} />
            </label>
            <button type="button" className="btn secondary req-quitar" disabled={f.lineas.length === 1}
              onClick={() => quitar(i)} aria-label="Quitar artículo">
              <Trash2 size={15} />
            </button>
            <label className="req-desc">Descripción del artículo
              <input value={l.descripcion} onChange={(e) => setLinea(i, 'descripcion', e.target.value)} />
            </label>
          </div>
        ))}
        <datalist id="req-unidades">
          {UNIDADES.map((u) => <option key={u} value={u} />)}
        </datalist>
        <button type="button" className="btn secondary" onClick={agregar} disabled={f.lineas.length >= MAX_LINEAS}>
          <Plus size={16} /> Agregar artículo
        </button>

        <h3 className="req-sub">Observaciones <span className="contador">opcional</span></h3>
        <label>
          <textarea rows="3" value={f.observaciones} onChange={set('observaciones')} />
        </label>

        {ligadas.length > 0 && (
          <div className="req-aviso">
            <strong>{ligadas.length} artículo(s) vienen del checklist de pendientes.</strong>
            <label className="req-aviso-check">
              <input type="checkbox" checked={completar} onChange={(e) => setCompletar(e.target.checked)} />
              <span>Marcar la requisición como completa al descargarla: se eliminarán de la lista de pendientes.</span>
            </label>
          </div>
        )}

        <div className="req-acciones req-acciones-pie">
          <button type="button" className="btn secondary" onClick={limpiar}>
            <Eraser size={16} /> Limpiar
          </button>
          <button type="button" className="btn" onClick={descargar} disabled={generando}>
            <Download size={16} /> {generando ? 'Generando…' : 'Descargar Excel'}
          </button>
        </div>
      </section>

      <aside className="req-previa">
        <div className="req-previa-cab">Vista previa (aproximada)</div>
        <div className="req-lienzo" ref={lienzo} style={{ height: medidas.alto || undefined }}>
          <div className="req-escala" style={{ width: ANCHO, transform: `scale(${medidas.escala})` }}>
            <div className="req-hoja" ref={hoja}>
              <Celda c="1 / 5" r="1" clase="sb">
                <img src="/static/logo_tollocan.png" alt="" className="req-logo" />
              </Celda>
              <Celda c="5 / 14" r="1" clase="sb titulo">
                <strong>GRUPO TOLLOCAN</strong>
                <strong>REQUISICION DE COMPRA</strong>
              </Celda>

              <Celda c="9 / 11" r="2" clase="sb der"><strong>FOLIO</strong></Celda>
              <Celda c="11 / 14" r="2" clase="centro"><strong>{f.folio}</strong></Celda>

              <Celda c="1 / 12" r="3 / 6" clase="empresa">
                <span className="etq">EMPRESA:</span>
                <strong className="valor-g">{EMPRESA}</strong>
                <span className="domicilio">{DOMICILIO}</span>
              </Celda>
              <Celda c="12 / 14" r="3" clase="etq-c"><span className="etq">DEPARTAMENTO:</span></Celda>
              <Celda c="12 / 14" r="4 / 6" clase="centro"><span className="valor-g">{f.departamento}</span></Celda>

              <Celda c="1 / 10" r="6 / 8">
                <span className="etq">DEPARTAMENTO SOLICITANTE:</span>
                <span className="valor">{f.departamento}</span>
              </Celda>
              <Celda c="10 / 14" r="6 / 8">
                <span className="etq">FECHA DE SOLICITUD:</span>
                <span className="valor">{fecha(f.fechaSolicitud)}</span>
              </Celda>
              <Celda c="1 / 10" r="8 / 10">
                <span className="etq">SOLICITADO POR:</span>
                <span className="valor">{f.solicitante}</span>
              </Celda>
              <Celda c="10 / 14" r="8 / 10">
                <span className="etq">FECHA EN QUE SE NECESITA:</span>
                <span className="valor">{fecha(f.fechaNecesita)}</span>
              </Celda>

              {CATEGORIAS.map((c, i) => (
                <Celda key={c} c={String(i + 1)} r="11" clase="cat">{c}</Celda>
              ))}
              {CATEGORIAS.map((c, i) => (
                <Celda key={c + 'x'} c={String(i + 1)} r="12" clase="cruz">
                  {f.categorias.includes(c) ? 'X' : ''}
                </Celda>
              ))}

              <Celda c="1 / 14" r="14" clase="linea-txt">
                <span className="etq">ENTRA EN PRESUPUESTO AUTORIZADO POR CONSEJO:</span>
                <strong>{f.presupuesto}</strong>
              </Celda>
              <Celda c="1 / 14" r="16" clase="linea-txt">
                <span className="etq">PROVEEDOR SUGERIDO:</span>
                <strong>{f.proveedor}</strong>
              </Celda>

              <Celda c="1" r="18" clase="enc">CANTIDAD</Celda>
              <Celda c="2 / 4" r="18" clase="enc">UNIDAD</Celda>
              <Celda c="4 / 10" r="18" clase="enc">DESCRIPCIÓN DEL ARTÍCULO</Celda>
              <Celda c="10 / 13" r="18" clase="enc">PRECIO UNITARIO</Celda>
              <Celda c="13" r="18" clase="enc">IMPORTE</Celda>

              <Celda c="1 / 14" r="19 / 36" clase="caja" />
              {Array.from({ length: MAX_LINEAS }, (_, i) => {
                const l = f.lineas[i]
                const r = String(19 + i)
                const usada = !!l && l.descripcion.trim() !== ''
                return [
                  <Celda key={'a' + i} c="1" r={r} clase="it der">{usada ? l.cantidad : ''}</Celda>,
                  <Celda key={'b' + i} c="2 / 4" r={r} clase="it centro">{usada ? l.unidad : ''}</Celda>,
                  <Celda key={'c' + i} c="4 / 10" r={r} clase="it izq">{usada ? l.descripcion : ''}</Celda>,
                  <Celda key={'d' + i} c="10 / 13" r={r} clase="it der">{usada ? CERO : ''}</Celda>,
                  <Celda key={'e' + i} c="13" r={r} clase="it der ult">{usada ? CERO : ''}</Celda>,
                ]
              })}

              <Celda c="10 / 13" r="32" clase="sb der"><span className="etq-t">SUBTOTAL:</span></Celda>
              <Celda c="13" r="32" clase="der">{CERO}</Celda>
              <Celda c="10 / 13" r="33" clase="sb der"><span className="etq-t">IVA:</span></Celda>
              <Celda c="13" r="33" clase="der">{CERO}</Celda>
              <Celda c="10 / 13" r="34" clase="sb der"><span className="etq-t">RET ISR:</span></Celda>
              <Celda c="13" r="34" clase="der">{CERO}</Celda>
              <Celda c="10 / 13" r="35" clase="sb der"><span className="etq-t">TOTAL:</span></Celda>
              <Celda c="13" r="35" clase="der"><strong>{CERO}</strong></Celda>

              <Celda c="1 / 14" r="36" clase="obs">
                <span className="etq">OBSERVACIONES:</span>
                <span className="valor pre">{f.observaciones}</span>
              </Celda>

              <Celda c="1 / 5" r="38" clase="firma">
                <span className="etq">SOLICITANTE:</span>
                <span className="linea-f" />
                <span className="etq">NOMBRE Y FIRMA</span>
              </Celda>
              <Celda c="6 / 9" r="38" clase="firma">
                <span className="etq">APROBADO POR:</span>
                <span className="linea-f" />
                <span className="etq">GERENTE ADMINISTRATIVO</span>
                <span className="etq">NOMBRE Y FIRMA</span>
              </Celda>
              <Celda c="10 / 14" r="38" clase="firma">
                <span className="etq">SOLICITANTE:</span>
                <span className="linea-f" />
                <span className="etq">GERENTE GENERAL/DIRECTORES</span>
                <span className="etq">NOMBRE Y FIRMA</span>
              </Celda>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}