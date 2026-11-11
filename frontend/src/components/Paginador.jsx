import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Paginador({ p }) {
  if (p.cantidad <= p.filas) return null
  const desde = (p.pagina - 1) * p.filas + 1
  const hasta = Math.min(p.pagina * p.filas, p.cantidad)

  return (
    <div className="paginador">
      <span>{desde}–{hasta} de {p.cantidad}</span>
      <div className="paginador-botones">
        <button type="button" className="btn secondary" disabled={p.pagina <= 1}
          aria-label="Página anterior" onClick={() => p.setPagina(p.pagina - 1)}>
          <ChevronLeft size={16} />
        </button>
        <span>Página {p.pagina} de {p.total}</span>
        <button type="button" className="btn secondary" disabled={p.pagina >= p.total}
          aria-label="Página siguiente" onClick={() => p.setPagina(p.pagina + 1)}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}