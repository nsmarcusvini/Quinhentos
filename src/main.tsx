import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { iniciarAnalytics } from './lib/analytics'
import { registerServiceWorker } from './pwa'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Elemento #root não encontrado no HTML.')

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

iniciarAnalytics()
registerServiceWorker()
