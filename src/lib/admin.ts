/**
 * Painel de admin — camada de dados.
 *
 * Uma chamada só, `admin-dados`, devolve o retrato inteiro: contas, licenças e
 * cobranças iniciadas. Tudo o que o painel mostra é derivado disso em memória,
 * sem uma consulta por gráfico — a base é pequena o bastante para isso e a
 * alternativa seria uma dúzia de idas ao servidor a cada troca de aba.
 *
 * Nada aqui escreve. O painel lê o negócio; quem muda licença é o webhook.
 */
import { chamar } from './api'

/** Uma conta do Supabase Auth, com o progresso do desafio dela junto. */
export interface AdminUsuario {
  id: string
  email: string | null
  criadoEm: string
  ultimoLoginEm: string | null
  confirmadoEm: string | null
  desafio: {
    marcadas: number
    /** Soma dos números marcados, em reais. */
    guardado: number
    primeiraEm: number | null
    ultimaEm: number | null
    atualizadoEm: string | null
  } | null
}

export type PlanoLicenca = 'vitalicio' | 'mensal' | (string & {})
export type ProvedorLicenca = 'stripe' | 'abacatepay' | (string & {})

export interface AdminLicenca {
  key: string
  userId: string | null
  email: string | null
  plano: PlanoLicenca
  provedor: ProvedorLicenca
  /** 'card', 'pix', 'boleto'… null enquanto a Stripe não foi consultada. */
  formaDePagamento: string | null
  valorCentavos: number | null
  moeda: string | null
  criadaEm: string
  ultimoUsoEm: string | null
  revogadaEm: string | null
  motivoRevogacao: string | null
  /** Fim do acesso do mensal. Null no vitalício, que não expira. */
  fimDoPeriodo: string | null
  idExterno: string
  assinatura: string | null
}

/** Checkout iniciado — pago ou não. É o meio do funil. */
export interface AdminCobranca {
  provedor: ProvedorLicenca
  idExterno: string
  userId: string
  criadaEm: string
}

export interface AdminDados {
  geradoEm: string
  usuarios: AdminUsuario[]
  licencas: AdminLicenca[]
  cobrancas: AdminCobranca[]
}

/** Por que o painel não abriu. */
export type ErroAdmin = 'nao_autenticado' | 'nao_autorizado' | 'indisponivel'

/**
 * Se o atalho do painel aparece para esta conta.
 *
 * Isto é COSMÉTICO e só decide o que a tela mostra. Quem libera o painel é a
 * Edge Function, que confere o ID do JWT contra o secret `ADMIN_USER_IDS` —
 * apagar este `if` pelo DevTools não dá acesso a nada, só revela um link que
 * responde 403.
 *
 * Compara ID e não e-mail pelo mesmo motivo do servidor, mais um: o Vite
 * embute esta constante no bundle, que é público. Com e-mails, o arquivo
 * entregava de bandeja quais endereços valia a pena atacar. Um UUID exposto
 * não serve para nada — não dá para se cadastrar escolhendo o seu.
 *
 * `VITE_ADMIN_USER_IDS` existe para o atalho acompanhar o secret do servidor
 * sem mexer no código. Sem ela, vale o dono do produto.
 */
const ADMINS = (
  import.meta.env.VITE_ADMIN_USER_IDS || 'bb7c0fbd-2a03-4cdc-839a-1fd57e13b892'
)
  .split(',')
  .map((id: string) => id.trim().toLowerCase())
  .filter(Boolean)

export const ehAdmin = (userId?: string | null): boolean =>
  Boolean(userId) && ADMINS.includes(userId!.trim().toLowerCase())

export async function buscarDadosAdmin(): Promise<AdminDados> {
  return chamar<AdminDados>('admin-dados', {})
}

/**
 * Traduz a exceção da rede no motivo que a tela sabe explicar.
 *
 * 403 e 401 são veredito do servidor e merecem tela própria; o resto é
 * "tente de novo", porque não dá para distinguir servidor fora do ar de
 * aparelho sem internet — e as duas telas seriam iguais mesmo.
 */
export function motivoDoErro(erro: unknown): ErroAdmin {
  const mensagem = erro instanceof Error ? erro.message : ''
  if (mensagem === 'nao_autenticado') return 'nao_autenticado'
  if (mensagem === 'nao_autorizado') return 'nao_autorizado'
  return 'indisponivel'
}

/** Centavos do gateway → reais. Null vira 0: licença de cortesia não fatura. */
export const emReais = (centavos: number | null): number => (centavos ?? 0) / 100

/**
 * Como a pessoa pagou, em português.
 *
 * O AbacatePay só faz Pix, então lá o provedor já responde a pergunta. Na
 * Stripe o método vem da cobrança e pode faltar — nesse caso o painel diz que
 * não sabe, em vez de chutar "cartão" e virar um número errado no gráfico.
 */
export function rotularFormaDePagamento(licenca: AdminLicenca): string {
  switch (licenca.formaDePagamento) {
    case 'card':
      return 'Cartão'
    case 'pix':
      return 'Pix'
    case 'boleto':
      return 'Boleto'
    case null:
      return licenca.provedor === 'abacatepay' ? 'Pix' : 'Não identificada'
    default:
      return licenca.formaDePagamento
  }
}

export const rotularPlano = (plano: PlanoLicenca): string =>
  plano === 'mensal' ? 'Mensal' : plano === 'vitalicio' ? 'Vitalício' : plano

export const rotularProvedor = (provedor: ProvedorLicenca): string =>
  provedor === 'stripe' ? 'Stripe' : provedor === 'abacatepay' ? 'AbacatePay' : provedor

/** Situação da licença hoje — o que decide se a pessoa entra no app. */
export type SituacaoLicenca = 'ativa' | 'revogada' | 'expirada'

export function situacaoDaLicenca(licenca: AdminLicenca, agora = Date.now()): SituacaoLicenca {
  if (licenca.revogadaEm) return 'revogada'
  if (licenca.fimDoPeriodo && new Date(licenca.fimDoPeriodo).getTime() <= agora) return 'expirada'
  return 'ativa'
}
