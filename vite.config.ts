import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Sem estas duas o app não conecta em nada.
 *
 * `createClient(undefined, undefined)` estoura no carregamento, então um build
 * sem elas publica uma tela branca — e o deploy passa verde, porque compilar
 * funcionou. Falhar aqui troca uma queda silenciosa em produção por um erro de
 * build, que é onde dá para consertar antes de alguém ver.
 *
 * Só no build: em `dev` o aviso atrapalharia quem clonou e ainda não copiou o
 * `.env.example`.
 */
const OBRIGATORIAS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

function exigirVariaveis(mode: string): void {
  if (mode !== 'production') return

  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const faltando = OBRIGATORIAS.filter((nome) => !env[nome]?.trim())
  if (faltando.length === 0) return

  throw new Error(
    `Build abortado: faltam ${faltando.join(' e ')}.\n` +
      'Copie .env.example para .env, ou defina as variáveis no painel do seu host.',
  )
}

export default defineConfig(({ mode }) => {
  exigirVariaveis(mode)

  return {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'og-image.png'],
      manifest: {
        id: '/',
        name: 'Norte Financeiro — Junte R$ 125.250',
        short_name: 'Norte',
        description:
          'Seu norte para juntar dinheiro: 500 casinhas numeradas, uma de cada vez, até R$ 125.250.',
        lang: 'pt-BR',
        dir: 'ltr',
        start_url: '/app',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0A0C10',
        theme_color: '#0A0C10',
        categories: ['finance', 'productivity', 'lifestyle'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Abrir o desafio',
            short_name: 'Desafio',
            url: '/app',
            icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // App 100% offline: tudo que o build gera entra no precache.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
  ],
  }
})
