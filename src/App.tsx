import { Navigate, Route, Routes } from 'react-router-dom'
import { ConfettiProvider } from './components/Confetti'
import { ToastProvider } from './components/ui/Toast'
import AppPage from './routes/app/AppPage'
import LandingPage from './routes/landing/LandingPage'
import { ChallengeProvider } from './state/ChallengeContext'
import { useThemeEffect } from './state/useTheme'

function AppRoutes() {
  useThemeEffect()

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<AppPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ChallengeProvider>
      <ConfettiProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </ConfettiProvider>
    </ChallengeProvider>
  )
}
