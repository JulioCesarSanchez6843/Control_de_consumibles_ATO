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
  login: (d) => req('/login', { method: 'POST', body: JSON.stringify(d) }),
  logout: () => req('/logout', { method: 'POST' }),
  consumables: () => req('/consumables'),
  addConsumable: (d) => req('/consumables', { method: 'POST', body: JSON.stringify(d) }),
  updateConsumable: (id, d) => req(`/consumables/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  addStock: (id, d) => req(`/consumables/${id}/agregar`, { method: 'POST', body: JSON.stringify(d) }),
  printers: () => req('/printers'),
  addPrinter: (d) => req('/printers', { method: 'POST', body: JSON.stringify(d) }),
  updatePrinter: (id, d) => req(`/printers/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deletePrinter: (id) => req(`/printers/${id}`, { method: 'DELETE' }),
  addPrinterLine: (id, d) => req(`/printers/${id}/lineas`, { method: 'POST', body: JSON.stringify(d) }),
  deletePrinterLine: (id) => req(`/printers/lineas/${id}`, { method: 'DELETE' }),
  departamentos: () => req('/departamentos'),
  movements: () => req('/movements'),
  addMovement: (d) => req('/movements', { method: 'POST', body: JSON.stringify(d) }),
  anular: (id) => req(`/movements/${id}/anular`, { method: 'POST' }),
}