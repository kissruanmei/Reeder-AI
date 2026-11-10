import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { migrateLegacyLibrary } from './services/legacyMigration.js'
import './index.css'

migrateLegacyLibrary().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
