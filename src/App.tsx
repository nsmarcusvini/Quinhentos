import { Navigate, Route, Routes } from 'react-router-dom'
import { ChallengeProvider } from './state/ChallengeContext'
import { useThemeEffect } from './state/useTheme'

function AppRoutes() {
  useThemeEffect()

  return (
    <Routes>
      <Route path="/" element={<div className="p-8">Landing</div>} />
      <Route path="/app" element={<div className="p-8">Desafio</div>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ChallengeProvider>
      <AppRoutes />
    </ChallengeProvider>
  )
}
