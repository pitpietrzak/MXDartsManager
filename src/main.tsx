import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { UserPreferencesProvider } from './contexts/UserPreferencesContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <UserPreferencesProvider>
          <App />
        </UserPreferencesProvider>
      </LanguageProvider>
    </AuthProvider>
  </StrictMode>,
)
