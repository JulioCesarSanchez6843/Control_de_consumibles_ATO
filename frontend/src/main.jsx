import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from './components/Toast.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </ErrorBoundary>
)
