import { Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/ui/Toast'
import AppPage from './routes/app/AppPage'
import { ChallengeProvider } from './state/ChallengeContext'
import { useThemeEffect } from './state/useTheme'

function AppRoutes() {
  useThemeEffect()

  return (
    <Routes>
      <Route path="/" element={<div className="p-8">Landing</div>} />
      <Route path="/app" element={<AppPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ChallengeProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </ChallengeProvider>
  )
}
