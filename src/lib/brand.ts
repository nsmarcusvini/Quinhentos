/**
 * A marca em um lugar só.
 *
 * Antes o nome aparecia solto em trinta e poucos arquivos — copy, títulos,
 * prefixos de log, chaves de storage, e-mails. Renomear virou uma varredura de
 * texto, que é exatamente o tipo de mudança que esquece um canto e deixa o
 * produto falando dois nomes ao mesmo tempo.
 */

export const APP_NAME = 'Norte Financeiro'

/** Prefixo dos logs no console. */
export const LOG_PREFIX = `[${APP_NAME}]`

/**
 * Prefixo das chaves do localStorage.
 *
 * Mudou junto com o nome, e por isso existe a migração em `storage.ts`,
 * `supabase.ts` e `EntitlementContext.tsx`: trocar a chave sem mover o valor
 * apagaria o progresso e deslogaria todo mundo que já usava o app.
 */
export const STORAGE_PREFIX = 'norte'

/**
 * Prefixo das chaves de acesso emitidas daqui para a frente.
 *
 * As antigas continuam valendo — ver `LICENSE_PATTERN`. Invalidar chave de
 * quem já pagou por causa de uma troca de nome seria inaceitável.
 */
export const LICENSE_PREFIX = 'NF'

/** Prefixo aposentado, aceito para sempre nas chaves já emitidas. */
export const LEGACY_LICENSE_PREFIX = 'D500'
