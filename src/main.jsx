import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installMotionMode } from './lib/motion'
import { installErrorMonitoring } from './lib/errorMonitoring'

installMotionMode()
installErrorMonitoring()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
