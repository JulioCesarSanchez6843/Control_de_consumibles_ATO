import { useState } from 'react'
import { api } from '../api'

export default function Login({ onLogin }) {
  const [f, setF] = useState({ username: '', password: '' })
  const [err, setErr] = useState('')
  const [enviando, setEnviando] = useState(false)

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setEnviando(true)
    try {
      onLogin(await api.login(f))
    } catch (ex) {
      setErr(ex.message)
      setEnviando(false)
    }
  }

  return (
    <div className="login-pagina">
      <form className="card login" onSubmit={submit}>
        <div className="login-cabecera">
          <img src="/static/logo_tollocan.png" alt="Grupo Tollocan" className="login-logo" />
        </div>
        <h2>Control de consumibles</h2>
        <label>Usuario
          <input value={f.username} onChange={set('username')} autoFocus required autoComplete="username" />
        </label>
        <label>Contraseña
          <input type="password" value={f.password} onChange={set('password')} required
            autoComplete="current-password" />
        </label>
        <button className="btn" type="submit" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
        {err && <div role="alert" className="alert error">{err}</div>}
      </form>
    </div>
  )
}