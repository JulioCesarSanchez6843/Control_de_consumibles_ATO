import { Boxes, ClipboardList, FileText, History as IcoHistorial, ListChecks, PackageMinus, PackagePlus, Printer, ShieldCheck, ShoppingCart, Star, Users, Warehouse } from 'lucide-react'

export const GRUPOS = [
  {
    nombre: 'Bitácora', icono: ClipboardList, ruta: '/bitacora',
    tabs: [
      { etiqueta: 'Salidas', icono: PackageMinus, ruta: '/bitacora/salidas' },
      { etiqueta: 'Entradas', icono: PackagePlus, ruta: '/bitacora/entradas' },
    ],
  },
  {
    nombre: 'Inventarios', icono: Warehouse, ruta: '/inventarios',
    tabs: [
      { etiqueta: 'Stock', icono: Boxes, ruta: '/inventarios/stock' },
      { etiqueta: 'Impresoras', icono: Printer, ruta: '/inventarios/impresoras' },
    ],
  },
  {
    nombre: 'Compras', icono: ShoppingCart, ruta: '/compras',
    tabs: [
      { etiqueta: 'Requisición', icono: FileText, ruta: '/compras/requisicion' },
      { etiqueta: 'Por comprar', icono: ListChecks, ruta: '/compras/por-comprar' },
      { etiqueta: 'Frecuentes', icono: Star, ruta: '/compras/frecuentes' },
    ],
  },
  {
    nombre: 'Equipo TI', icono: ShieldCheck, ruta: '/equipo', admin: true,
    tabs: [
      { etiqueta: 'Usuarios', icono: Users, ruta: '/equipo/usuarios' },
      { etiqueta: 'Historial', icono: IcoHistorial, ruta: '/equipo/historial' },
    ],
  },
]

export const INICIO = {
  Salidas: '/bitacora/salidas',
  Entradas: '/bitacora/entradas',
  Inventario: '/inventarios/stock',
  Impresoras: '/inventarios/impresoras',
}

export const RUTA_INICIO_DEFECTO = '/bitacora/salidas'