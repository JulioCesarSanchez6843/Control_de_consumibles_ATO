function csrfToken() {
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)
  return m ? decodeURIComponent(m[1]) : ''
}

async function req(path, opts = {}) {
  const method = (opts.method || 'GET').toUpperCase()
  const headers = { 'Content-Type': 'application/json' }
  if (method !== 'GET') headers['X-CSRFToken'] = csrfToken()
  const res = await fetch('/api' + path, { ...opts, headers })
  if (!res.ok) {
    if (res.status === 401 && path !== '/login') window.dispatchEvent(new Event('sesion-expirada'))
    let msg = res.statusText
    try {
      const j = await res.json()
      msg = typeof j.detail === 'string' ? j.detail : 'Revisa los datos del formulario'
    } catch {}
    throw new Error(msg)
  }
  return res.json()
}

export const api = {
  csrf: () => req('/csrf'),
  me: () => req('/me'),
  updatePerfil: (d) => req('/me/perfil', { method: 'PUT', body: JSON.stringify(d) }),
  updatePreferencias: (d) => req('/me/preferencias', { method: 'PUT', body: JSON.stringify(d) }),
  login: (d) => req('/login', { method: 'POST', body: JSON.stringify(d) }),
  logout: () => req('/logout', { method: 'POST' }),
  consumables: () => req('/consumables'),
  stock: (params) => req('/consumables?' + new URLSearchParams(params).toString()),
  addConsumable: (d) => req('/consumables', { method: 'POST', body: JSON.stringify(d) }),
  updateConsumable: (id, d) => req(`/consumables/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  addStock: (id, d) => req(`/consumables/${id}/agregar`, { method: 'POST', body: JSON.stringify(d) }),
  toners: () => req('/toners'),
  addToner: (d) => req('/toners', { method: 'POST', body: JSON.stringify(d) }),
  printers: () => req('/printers'),
  addPrinter: (d) => req('/printers', { method: 'POST', body: JSON.stringify(d) }),
  updatePrinter: (id, d) => req(`/printers/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deletePrinter: (id) => req(`/printers/${id}`, { method: 'DELETE' }),
  addPrinterLine: (id, d) => req(`/printers/${id}/lineas`, { method: 'POST', body: JSON.stringify(d) }),
  deletePrinterLine: (id) => req(`/printers/lineas/${id}`, { method: 'DELETE' }),
  departamentos: () => req('/departamentos'),
  departamentosGestion: () => req('/departamentos/gestion'),
  addDepartamento: (d) => req('/departamentos/gestion', { method: 'POST', body: JSON.stringify(d) }),
  movements: (params) => req('/movements?' + new URLSearchParams(params).toString()),
  addMovement: (d) => req('/movements', { method: 'POST', body: JSON.stringify(d) }),
  anular: (id) => req(`/movements/${id}/anular`, { method: 'POST' }),
  usuarios: () => req('/users'),
  addUsuario: (d) => req('/users', { method: 'POST', body: JSON.stringify(d) }),
  updateUsuario: (id, d) => req(`/users/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  requisicionExcel: async (d) => {
    const res = await fetch('/api/requisicion/excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken() },
      body: JSON.stringify(d),
    })
    if (!res.ok) {
      if (res.status === 401) window.dispatchEvent(new Event('sesion-expirada'))
      let msg = res.statusText
      try {
        const j = await res.json()
        if (typeof j.detail === 'string') msg = j.detail
      } catch {}
      throw new Error(msg)
    }
    const cd = res.headers.get('Content-Disposition') || ''
    const largo = cd.match(/filename\*=UTF-8''([^;]+)/)
    const simple = cd.match(/filename="([^"]+)"/)
    const nombre = largo ? decodeURIComponent(largo[1]) : simple ? simple[1] : 'Requisicion.xlsm'
    return { blob: await res.blob(), nombre }
  },
  notasCompra: () => req('/purchase-notes'),
  addNotaCompra: (d) => req('/purchase-notes', { method: 'POST', body: JSON.stringify(d) }),
  updateNotaCompra: (id, d) => req(`/purchase-notes/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteNotaCompra: (id, motivo) => req(`/purchase-notes/${id}${motivo ? '?motivo=' + motivo : ''}`, { method: 'DELETE' }),
  notasARequisicion: (ids) => req('/purchase-notes/requisicion', { method: 'POST', body: JSON.stringify({ ids }) }),
  frecuentes: (params) => req('/frequent-items' + (params ? '?' + new URLSearchParams(params).toString() : '')),
  deleteFrecuente: (id) => req(`/frequent-items/${id}`, { method: 'DELETE' }),
  actividad: (params) => req('/activity?' + new URLSearchParams(params).toString()),
}