import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import MobileControl from './MobileControl.jsx'

const isMobile = window.location.pathname === '/mobile'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isMobile ? <MobileControl /> : <App />}
  </StrictMode>,
)
