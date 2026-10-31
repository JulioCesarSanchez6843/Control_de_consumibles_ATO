export const BASE = { tema: 'oscuro', color: 'rojo', fuente: 'sistema', tamano: 'normal', filas: 25, inicio: 'Salidas' }

export const PALETAS = {
  rojo: { nombre: 'Rojo', primary: '#c3002f', oscuro: '#9d0026', hover: '#e1003a', rgb: '195, 0, 47', acentoOscuro: '#ff4d6d', acentoClaro: '#b3002a' },
  azul: { nombre: 'Azul', primary: '#2563eb', oscuro: '#1d4ed8', hover: '#3b82f6', rgb: '37, 99, 235', acentoOscuro: '#60a5fa', acentoClaro: '#1d4ed8' },
  verde: { nombre: 'Verde', primary: '#16a34a', oscuro: '#15803d', hover: '#22c55e', rgb: '22, 163, 74', acentoOscuro: '#4ade80', acentoClaro: '#15803d' },
  morado: { nombre: 'Morado', primary: '#7c3aed', oscuro: '#6d28d9', hover: '#8b5cf6', rgb: '124, 58, 237', acentoOscuro: '#a78bfa', acentoClaro: '#6d28d9' },
  naranja: { nombre: 'Naranja', primary: '#ea580c', oscuro: '#c2410c', hover: '#f97316', rgb: '234, 88, 12', acentoOscuro: '#fb923c', acentoClaro: '#c2410c' },
  grafito: { nombre: 'Grafito', primary: '#475569', oscuro: '#334155', hover: '#64748b', rgb: '71, 85, 105', acentoOscuro: '#94a3b8', acentoClaro: '#334155' },
}

export const FUENTES = {
  sistema: { nombre: 'Sistema', familia: 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif' },
  clasica: { nombre: 'Arial', familia: 'Arial, Helvetica, sans-serif' },
  redonda: { nombre: 'Verdana', familia: 'Verdana, Tahoma, sans-serif' },
  serif: { nombre: 'Georgia', familia: 'Georgia, "Times New Roman", serif' },
  mono: { nombre: 'Consolas', familia: 'Consolas, "Courier New", monospace' },
}

export const TAMANOS = {
  chico: { nombre: 'Pequeño', valor: '87.5%' },
  normal: { nombre: 'Normal', valor: '100%' },
  grande: { nombre: 'Grande', valor: '112.5%' },
  enorme: { nombre: 'Muy grande', valor: '125%' },
}

export const FILAS = [10, 25, 50, 100]

export const INICIOS = [
  ['Salidas', 'Salidas'],
  ['Entradas', 'Entradas'],
  ['Inventario', 'Stock'],
  ['Impresoras', 'Impresoras'],
]

const TEMAS = ['claro', 'oscuro', 'sistema']
const tiene = (obj, k) => Object.prototype.hasOwnProperty.call(obj, k)

export function normalizar(p) {
  const r = { ...BASE }
  if (!p || typeof p !== 'object') return r
  if (TEMAS.includes(p.tema)) r.tema = p.tema
  if (tiene(PALETAS, p.color)) r.color = p.color
  if (tiene(FUENTES, p.fuente)) r.fuente = p.fuente
  if (tiene(TAMANOS, p.tamano)) r.tamano = p.tamano
  if (FILAS.includes(p.filas)) r.filas = p.filas
  if (INICIOS.some(([v]) => v === p.inicio)) r.inicio = p.inicio
  return r
}

export function aplicar(prefs, tema) {
  const p = normalizar(prefs)
  const c = PALETAS[p.color]
  const claro = tema === 'claro'
  const s = document.documentElement.style
  s.setProperty('--primary', c.primary)
  s.setProperty('--primary-dark', c.oscuro)
  s.setProperty('--primary-hover', c.hover)
  s.setProperty('--primary-rgb', c.rgb)
  s.setProperty('--primary-soft', `rgba(${c.rgb}, ${claro ? 0.1 : 0.16})`)
  s.setProperty('--accent', claro ? c.acentoClaro : c.acentoOscuro)
  s.setProperty('--glow', `rgba(${c.rgb}, ${claro ? 0.07 : 0.13})`)
  s.setProperty('--glow-login', `rgba(${c.rgb}, ${claro ? 0.12 : 0.22})`)
  s.setProperty('--row-hover', `rgba(${c.rgb}, ${claro ? 0.1 : 0.14})`)
  s.setProperty('--fuente', FUENTES[p.fuente].familia)
  s.fontSize = TAMANOS[p.tamano].valor
}