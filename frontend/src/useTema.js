import { useCallback, useEffect, useState } from 'react'

const CLAVE = 'tema'
const EVENTO = 'tema-cambio'

function leer() {
  try {
    const t = JSON.parse(window.localStorage.getItem(CLAVE))
    return t === 'claro' || t === 'oscuro' || t === 'sistema' ? t : 'oscuro'
  } catch {
    return 'oscuro'
  }
}

function resolver(t) {
  if (t !== 'sistema') return t
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro'
}

export default function useTema() {
  const [tema, setTemaEstado] = useState(leer)
  const [aplicado, setAplicado] = useState(() => resolver(leer()))

  useEffect(() => {
    const sincronizar = (e) => setTemaEstado(e.detail)
    window.addEventListener(EVENTO, sincronizar)
    return () => window.removeEventListener(EVENTO, sincronizar)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const aplicar = () => {
      const r = resolver(tema)
      document.documentElement.dataset.tema = r
      setAplicado(r)
    }
    aplicar()
    if (tema !== 'sistema') return undefined
    mq.addEventListener('change', aplicar)
    return () => mq.removeEventListener('change', aplicar)
  }, [tema])

  const setTema = useCallback((t) => {
    try { window.localStorage.setItem(CLAVE, JSON.stringify(t)) } catch {}
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: t }))
  }, [])

  const alternar = () => setTema(aplicado === 'claro' ? 'oscuro' : 'claro')

  return { tema, aplicado, setTema, alternar }
}