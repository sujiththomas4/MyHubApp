import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { CapitalProvider } from '@/context/CapitalContext'
import { FxProvider } from '@/context/FxContext'
import { AuthProvider } from '@/context/AuthContext'
import App from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <FxProvider>
          <CapitalProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </CapitalProvider>
        </FxProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
)
