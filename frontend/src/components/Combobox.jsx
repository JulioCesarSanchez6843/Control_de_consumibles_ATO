import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function Combobox({ opciones, value, onChange, placeholder = 'Busca o elige…', disabled = false, inputRef }) {
  const [abierto, setAbierto] = useState(false)
  const [escribiendo, setEscribiendo] = useState(false)
  const [texto, setTexto] = useState('')
  const [activo, setActivo] = useState(0)
  const lista = useRef(null)
  const interno = useRef(null)
  const ref = inputRef || interno

  const actual = opciones.find((o) => String(o.value) === String(value))

  const filtradas = useMemo(() => {
    const t = escribiendo ? texto.trim().toLowerCase() : ''
    if (!t) return opciones
    return opciones.filter((o) => (o.buscar || `${o.label} ${o.sub || ''}`).toLowerCase().includes(t))
  }, [opciones, texto, escribiendo])

  useEffect(() => {
    if (!abierto || !lista.current) return
    const el = lista.current.children[activo]
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [activo, abierto])

  const cerrar = () => {
    setAbierto(false)
    setEscribiendo(false)
    setTexto('')
  }

  const elegir = (o) => {
    onChange(o.value)
    cerrar()
  }

  const abrir = () => {
    if (disabled) return
    setActivo(Math.max(0, filtradas.findIndex((o) => String(o.value) === String(value))))
    setAbierto(true)
  }

  const teclas = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!abierto) return abrir()
      setActivo((a) => Math.min(filtradas.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!abierto) return abrir()
      setActivo((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter' && abierto) {
      e.preventDefault()
      if (filtradas[activo]) elegir(filtradas[activo])
    } else if (e.key === 'Escape' && abierto) {
      e.preventDefault()
      cerrar()
    }
  }

  return (
    <div className={'combo' + (abierto ? ' abierto' : '')}>
      <input
        ref={ref}
        type="text"
        role="combobox"
        aria-expanded={abierto}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={escribiendo ? texto : (actual ? actual.label : '')}
        onFocus={(e) => { abrir(); e.target.select() }}
        onClick={abrir}
        onBlur={cerrar}
        onKeyDown={teclas}
        onChange={(e) => {
          setTexto(e.target.value)
          setEscribiendo(true)
          setActivo(0)
          setAbierto(true)
        }}
      />
      <button type="button" tabIndex={-1} className="combo-flecha" disabled={disabled} aria-label="Mostrar lista"
        onMouseDown={(e) => {
          e.preventDefault()
          if (abierto) cerrar()
          else { ref.current && ref.current.focus(); abrir() }
        }}>
        <ChevronDown size={16} />
      </button>
      {abierto && (
        <ul className="combo-lista" ref={lista} role="listbox">
          {filtradas.length === 0 && <li className="combo-vacio">Sin resultados</li>}
          {filtradas.map((o, i) => (
            <li key={o.value} role="option" aria-selected={String(o.value) === String(value)}
              className={'combo-op' + (i === activo ? ' activo' : '') + (String(o.value) === String(value) ? ' elegido' : '') + (o.bajo ? ' bajo' : '')}
              onMouseDown={(e) => { e.preventDefault(); elegir(o) }}
              onMouseEnter={() => setActivo(i)}>
              <span>{o.label}</span>
              {o.sub && <small>{o.sub}</small>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
