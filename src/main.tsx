import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import eruda from 'eruda';

// Initialiser Eruda pour le débogage sur mobile
// Se lance en mode développement ou si l'URL contient ?debug=true
if (import.meta.env.DEV || window.location.search.includes('debug=true')) {
  eruda.init();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
