import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router.tsx'
import './index.css'
import './features/contracts/contracts.css'
import { LanguageProvider } from './i18n/language'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider><RouterProvider router={router} /></LanguageProvider>
  </StrictMode>,
)
