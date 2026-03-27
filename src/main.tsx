import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { UserPreferencesProvider } from './contexts/UserPreferencesContext'
import { ToastProvider } from './contexts/ToastContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <UserPreferencesProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </UserPreferencesProvider>
      </LanguageProvider>
    </AuthProvider>
  </StrictMode>,
)
