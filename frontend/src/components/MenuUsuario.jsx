import { useEffect, useRef, useState } from 'react'
import { LogOut, Menu, Settings, X } from 'lucide-react'

export default function MenuUsuario({ onAjustes, onSalir }) {
  const [abierto, setAbierto] = useState(false)
  const caja = useRef(null)

  useEffect(() => {
    if (!abierto) return undefined
    const fuera = (e) => {
      if (caja.current && !caja.current.contains(e.target)) setAbierto(false)
    }
    const tecla = (e) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  const ir = (accion) => () => {
    setAbierto(false)
    accion()
  }

  return (
    <div className="menu" ref={caja}>
      <button type="button" className="btn-tema" aria-haspopup="menu" aria-expanded={abierto}
        aria-label="Menú" title="Menú" onClick={() => setAbierto(!abierto)}>
        {abierto ? <X size={18} strokeWidth={2.2} /> : <Menu size={18} strokeWidth={2.2} />}
      </button>
      {abierto && (
        <div className="menu-lista" role="menu">
          <button type="button" role="menuitem" className="menu-item" onClick={ir(onAjustes)}>
            <Settings size={16} /> Configuración
          </button>
          <div className="menu-sep" />
          <button type="button" role="menuitem" className="menu-item salir" onClick={ir(onSalir)}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}