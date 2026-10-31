import { Moon, Sun } from 'lucide-react'
import useTema from '../useTema'

export default function BotonTema() {
  const { aplicado, alternar } = useTema()
  const claro = aplicado === 'claro'
  const texto = claro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'

  return (
    <button type="button" className="btn-tema" onClick={alternar} title={texto} aria-label={texto}>
      {claro ? <Moon size={17} strokeWidth={2.2} /> : <Sun size={17} strokeWidth={2.2} />}
    </button>
  )
}