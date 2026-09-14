import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ConfettiProvider } from './components/Confetti'
import { OfflineReadyNotice } from './components/OfflineReadyNotice'
import { ToastProvider } from './components/ui/Toast'
import { useRouteEffects } from './hooks/useRouteEffects'
import LandingPage from './routes/landing/LandingPage'
import { AuthProvider } from './state/AuthContext'
import { ChallengeProvider } from './state/ChallengeContext'
import { EntitlementProvider } from './state/EntitlementContext'
import { SyncProvider } from './state/SyncContext'
import { useThemeEffect } from './state/useTheme'

// A landing é página de vendas: entra no bundle inicial para não gastar LCP
// nem mostrar "Carregando…" no primeiro contato. O app fica lazy.
const AppPage = lazy(() => import('./routes/app/AppPage'))
const Acesso = lazy(() => import('./routes/app/Acesso'))
// Painel de admin: uma pessoa usa, e o portão de verdade é a Edge Function.
// Fica lazy para não pesar o bundle de quem só quer o desafio.
const AdminPage = lazy(() => import('./routes/admin/AdminPage'))
const Termos = lazy(() => import('./routes/legal/Termos'))
const Privacidade = lazy(() => import('./routes/legal/Privacidade'))

function RouteFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg">
      <p className="text-sm text-muted">Carregando…</p>
    </div>
  )
}

function AppRoutes() {
  useThemeEffect()
  useRouteEffects()

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-xl focus:bg-brand-500 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-[#06210F]"
      >
        Pular para o conteúdo
      </a>

      <OfflineReadyNotice />

      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<AppPage />} />
          <Route path="/acesso" element={<Acesso />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/termos" element={<Termos />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ChallengeProvider>
        <EntitlementProvider>
          <SyncProvider>
          <ConfettiProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
            </ConfettiProvider>
          </SyncProvider>
        </EntitlementProvider>
      </ChallengeProvider>
    </AuthProvider>
  )
}
