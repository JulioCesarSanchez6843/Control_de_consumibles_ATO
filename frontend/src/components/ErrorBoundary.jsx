import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    const texto = (this.state.error && this.state.error.stack) || String(this.state.error)
    return (
      <div className="card" style={{ margin: 24 }}>
        <h2>Ocurrió un error en la pantalla</h2>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>{texto}</pre>
        <button className="btn" onClick={() => window.location.reload()}>Recargar</button>
      </div>
    )
  }
}