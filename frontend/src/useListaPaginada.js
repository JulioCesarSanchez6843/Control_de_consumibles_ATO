import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function useListaPaginada(cargar, { base = {}, filas = 25, claves = [] } = {}) {
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [cantidad, setCantidad] = useState(0)
  const [paginas, setPaginas] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const [resumen, setResumen] = useState(null)
  const [texto, setTexto] = useState(params.get('q') || '')
  const ultima = useRef(0)

  const pagina = Math.max(1, parseInt(params.get('pagina'), 10) || 1)
  const q = params.get('q') || ''
  const filtros = {}
  claves.forEach((k) => { filtros[k] = params.get(k) || '' })
  const huella = JSON.stringify([base, filtros, q, pagina, filas])

  const cambiar = useCallback((cambio, reemplazar = false) => {
    setParams((actual) => {
      const nuevo = new URLSearchParams(actual)
      Object.entries(cambio).forEach(([k, v]) => {
        if (v === '' || v == null || (k === 'pagina' && Number(v) <= 1)) nuevo.delete(k)
        else nuevo.set(k, String(v))
      })
      return nuevo
    }, { replace: reemplazar })
  }, [setParams])

  useEffect(() => {
    setTexto((t) => (t.trim() === q ? t : q))
  }, [q])

  useEffect(() => {
    if (texto.trim() === q) return undefined
    const id = setTimeout(() => cambiar({ q: texto.trim(), pagina: 1 }, true), 350)
    return () => clearTimeout(id)
  }, [texto, q, cambiar])

  useEffect(() => {
    const id = ++ultima.current
    setCargando(true)
    cargar({ ...base, ...filtros, q, pagina, filas })
      .then((r) => {
        if (id !== ultima.current) return
        setItems(r.resultados)
        setCantidad(r.total)
        setPaginas(r.paginas)
        setResumen(r.resumen || null)
        setError('')
        if (r.pagina !== pagina) cambiar({ pagina: r.pagina }, true)
      })
      .catch((e) => { if (id === ultima.current) setError(e.message) })
      .finally(() => { if (id === ultima.current) setCargando(false) })
  }, [cargar, huella, version, cambiar])

  return {
    pag: { items, pagina, total: paginas, setPagina: (n) => cambiar({ pagina: n }), cantidad, filas },
    cargando,
    error,
    resumen,
    texto,
    setTexto,
    filtros,
    setFiltro: (clave, valor) => cambiar({ [clave]: valor, pagina: 1 }),
    recargar: () => setVersion((v) => v + 1),
  }
}