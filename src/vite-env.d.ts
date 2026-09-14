/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Domínio registrado no Plausible. Vazio = analytics desligado. */
  readonly VITE_ANALYTICS_DOMAIN?: string
  /** Só para Plausible auto-hospedado. Vazio = plausible.io. */
  readonly VITE_ANALYTICS_SRC?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
