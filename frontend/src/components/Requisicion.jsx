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
const EMPRESAS = ['AUTOMOTRIZ TOLLOCAN S.A. DE C.V.']
const MAX_LINEAS = 13
const ANCHO = 820
const IVA_DEFECTO = '16'

const dos = (n) => String(n).padStart(2, '0')

const hoy = () => {
  const d = new Date()
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
}

const linea = () => ({ cantidad: '1', unidad: 'PIEZA', descripcion: '', precio: '' })

const vacio = (usuario) => ({
  empresa: EMPRESAS[0],
  folio: '',
  departamento: '',
  solicitante: usuario.nombre || usuario.username || '',
  fechaSolicitud: hoy(),
  fechaNecesita: '',
  categorias: [],
  presupuesto: '',
  proveedor: '',
  lineas: [linea()],
  subtotal: '',
  ivaPct: IVA_DEFECTO,
  isr: '',
  total: '',
  observaciones: '',
})

const num = (v) => {
  const n = parseFloat(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

const manual = (v) => (String(v).trim() === '' ? null : num(v))

const dinero = (n) => '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
    const usadas = f.lineas.filter((l) => l.descripcion.trim() || String(l.precio).trim() !== '')
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

  const filas = f.lineas.map((l) => ({ ...l, importe: num(l.cantidad) * num(l.precio) }))
  const subAuto = filas.reduce((s, l) => s + l.importe, 0)
  const subtotal = manual(f.subtotal) ?? subAuto
  const ivaPct = f.ivaPct ?? IVA_DEFECTO
  const iva = subtotal * (num(ivaPct) / 100)
  const isr = manual(f.isr) ?? 0
  const totalAuto = subtotal + iva - isr
  const total = manual(f.total) ?? totalAuto

  const faltan = []
  if (!f.empresa.trim()) faltan.push('empresa')
  if (!f.departamento.trim()) faltan.push('departamento solicitante')
  if (!f.solicitante.trim()) faltan.push('solicitado por')
  if (!f.fechaSolicitud) faltan.push('fecha de solicitud')
  if (!f.lineas.some((l) => l.descripcion.trim())) faltan.push('al menos un artículo con descripción')

  const ligadas = f.lineas.map((l) => l.notaId).filter(Boolean)

  const completarPendientes = async () => {
    const resultados = await Promise.allSettled(ligadas.map((id) => api.deleteNotaCompra(id)))
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
        <label>Empresa *
          <input list="req-empresas" value={f.empresa} onChange={set('empresa')} />
        </label>
        <datalist id="req-empresas">
          {EMPRESAS.map((e) => <option key={e} value={e} />)}
        </datalist>
        <div className="fila-2">
          <label>Folio
            <input value={f.folio} onChange={set('folio')} placeholder="Ej. SIS-2026-0001" />
          </label>
          <label>Departamento solicitante *
            <input list="req-deptos" value={f.departamento} onChange={set('departamento')} />
          </label>
        </div>
        <datalist id="req-deptos">
          {(departamentos || []).map((d) => <option key={d} value={d} />)}
        </datalist>
        <label>Solicitado por *
          <input value={f.solicitante} onChange={set('solicitante')} />
        </label>
        <div className="fila-2">
          <label>Fecha de solicitud *
            <input type="date" value={f.fechaSolicitud} onChange={set('fechaSolicitud')} />
          </label>
          <label>Fecha en que se necesita
            <input type="date" value={f.fechaNecesita} onChange={set('fechaNecesita')} />
          </label>
        </div>

        <h3 className="req-sub">Tipo de compra</h3>
        <div className="opciones-fila">
          {CATEGORIAS.map((c) => (
            <button type="button" key={c} aria-pressed={f.categorias.includes(c)}
              className={'chip-op' + (f.categorias.includes(c) ? ' activo' : '')}
              onClick={() => alternar(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="fila-2">
          <label>Entra en presupuesto autorizado por consejo
            <select value={f.presupuesto} onChange={set('presupuesto')}>
              <option value="">—</option>
              <option value="SÍ">Sí</option>
              <option value="NO">No</option>
            </select>
          </label>
          <label>Proveedor sugerido
            <input value={f.proveedor} onChange={set('proveedor')} placeholder="Opcional" />
          </label>
        </div>

        <h3 className="req-sub">Artículos <span className="contador">{f.lineas.length}/{MAX_LINEAS}</span></h3>
        {filas.map((l, i) => (
          <div className="req-linea" key={i}>
            <label>Cantidad
              <input type="number" min="0" step="any" value={l.cantidad}
                onChange={(e) => setLinea(i, 'cantidad', e.target.value)} />
            </label>
            <label>Unidad
              <input list="req-unidades" value={l.unidad}
                onChange={(e) => setLinea(i, 'unidad', e.target.value)} />
            </label>
            <label>Precio unitario
              <input type="number" min="0" step="0.01" value={l.precio} placeholder="Opcional"
                onChange={(e) => setLinea(i, 'precio', e.target.value)} />
            </label>
            <label className="req-desc">Descripción del artículo
              <input value={l.descripcion} onChange={(e) => setLinea(i, 'descripcion', e.target.value)} />
            </label>
            <div className="req-linea-pie">
              <span>Importe: <strong>{l.precio === '' ? '—' : dinero(l.importe)}</strong></span>
              <button type="button" className="btn secondary" disabled={f.lineas.length === 1}
                onClick={() => quitar(i)} aria-label="Quitar artículo">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
        <datalist id="req-unidades">
          {UNIDADES.map((u) => <option key={u} value={u} />)}
        </datalist>
        <button type="button" className="btn secondary" onClick={agregar} disabled={f.lineas.length >= MAX_LINEAS}>
          <Plus size={16} /> Agregar artículo
        </button>

        <h3 className="req-sub">Totales <span className="contador">opcionales</span></h3>
        <p className="hint">Subtotal, Ret. ISR y Total se calculan solos si los dejas vacíos. El IVA se calcula con el porcentaje que pongas.</p>
        <div className="fila-2">
          <label>Subtotal
            <input type="number" min="0" step="0.01" value={f.subtotal} placeholder={dinero(subAuto)}
              onChange={set('subtotal')} />
          </label>
          <label>IVA (%)
            <input type="number" min="0" max="100" step="any" value={ivaPct}
              onChange={set('ivaPct')} />
          </label>
          <label>Ret. ISR
            <input type="number" min="0" step="0.01" value={f.isr} placeholder={dinero(0)}
              onChange={set('isr')} />
          </label>
          <label>Total
            <input type="number" step="0.01" value={f.total} placeholder={dinero(totalAuto)}
              onChange={set('total')} />
          </label>
        </div>

        <p className="hint">IVA calculado: <strong>{dinero(iva)}</strong> ({num(ivaPct)}% de {dinero(subtotal)})</p>

        <h3 className="req-sub">Observaciones</h3>
        <label>
          <textarea rows="3" value={f.observaciones} onChange={set('observaciones')} placeholder="Opcional" />
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
                <strong className="valor-g">{f.empresa}</strong>
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
                const l = filas[i]
                const r = String(19 + i)
                const usada = !!l && (l.descripcion.trim() !== '' || l.precio !== '')
                return [
                  <Celda key={'a' + i} c="1" r={r} clase="it der">{usada ? l.cantidad : ''}</Celda>,
                  <Celda key={'b' + i} c="2 / 4" r={r} clase="it centro">{usada ? l.unidad : ''}</Celda>,
                  <Celda key={'c' + i} c="4 / 10" r={r} clase="it izq">{usada ? l.descripcion : ''}</Celda>,
                  <Celda key={'d' + i} c="10 / 13" r={r} clase="it der">
                    {usada && l.precio !== '' ? dinero(num(l.precio)) : ''}
                  </Celda>,
                  <Celda key={'e' + i} c="13" r={r} clase="it der ult">
                    {usada && l.precio !== '' ? dinero(l.importe) : ''}
                  </Celda>,
                ]
              })}

              <Celda c="10 / 13" r="32" clase="sb der"><span className="etq-t">SUBTOTAL:</span></Celda>
              <Celda c="13" r="32" clase="der">{dinero(subtotal)}</Celda>
              <Celda c="10 / 13" r="33" clase="sb der"><span className="etq-t">IVA:</span></Celda>
              <Celda c="13" r="33" clase="der">{dinero(iva)}</Celda>
              <Celda c="10 / 13" r="34" clase="sb der"><span className="etq-t">RET ISR:</span></Celda>
              <Celda c="13" r="34" clase="der">{dinero(isr)}</Celda>
              <Celda c="10 / 13" r="35" clase="sb der"><span className="etq-t">TOTAL:</span></Celda>
              <Celda c="13" r="35" clase="der"><strong>{dinero(total)}</strong></Celda>

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