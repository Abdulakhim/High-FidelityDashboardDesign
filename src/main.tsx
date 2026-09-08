import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Load fonts and leaflet-draw CSS non-blocking so they never stall the initial render
const inter = document.createElement('link')
inter.rel = 'stylesheet'
inter.href = 'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&display=swap'
document.head.appendChild(inter)

// Leaflet Draw — loaded from CDN to avoid Vite 8/rolldown CJS bundler issues
const drawCss = document.createElement('link')
drawCss.rel = 'stylesheet'
drawCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css'
document.head.appendChild(drawCss)

const drawJs = document.createElement('script')
drawJs.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js'
document.head.appendChild(drawJs)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
