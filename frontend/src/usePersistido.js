import { useEffect, useState } from 'react'

export default function usePersistido(clave, inicial) {
  const [valor, setValor] = useState(() => {
    try {
      const guardado = window.localStorage.getItem(clave)
      return guardado === null ? inicial : JSON.parse(guardado)
    } catch {
      return inicial
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(clave, JSON.stringify(valor))
    } catch {}
  }, [clave, valor])

  return [valor, setValor]
}