/**
 * Oferta do produto em um lugar só. O preço aparece na landing inteira e no
 * paywall — mudar aqui muda em todos, sem risco de a página anunciar um valor
 * e o checkout cobrar outro.
 */

export type PlanoId = 'vitalicio' | 'mensal'

export interface Plano {
  id: PlanoId
  /** Nome curto, como aparece no cartão de preço. */
  nome: string
  preco: number
  /** Sufixo do preço. Vazio no vitalício: "R$ 29,90" e ponto final. */
  sufixo: string
  /** Frase de uma linha logo abaixo do preço. */
  resumo: string
  /** Como se paga. O mensal é cartão-só porque Pix não faz recorrência. */
  metodos: string
  /** O que tranquiliza quem está decidindo. */
  seguranca: string
}

/**
 * Pagamento único, acesso vitalício.
 *
 * Aceita Pix, que é o que resolve para quem não tem cartão de crédito — e num
 * produto sobre juntar dinheiro essa parcela do público não é pequena.
 */
export const PLANO_VITALICIO: Plano = {
  id: 'vitalicio',
  nome: 'Vitalício',
  preco: 29.9,
  sufixo: 'uma vez',
  resumo: 'Paga uma vez e é seu para sempre',
  metodos: 'Pix ou cartão',
  seguranca: '7 dias de garantia',
}

/**
 * Assinatura mensal.
 *
 * Cartão-só por limitação do meio de pagamento, não por escolha: Pix não faz
 * cobrança recorrente. A tela precisa dizer isso, senão quem só tem Pix tenta,
 * não consegue e vai embora achando que o site está quebrado.
 */
export const PLANO_MENSAL: Plano = {
  id: 'mensal',
  nome: 'Mensal',
  preco: 5.9,
  sufixo: 'por mês',
  resumo: 'Para começar barato e decidir depois',
  metodos: 'Só cartão de crédito',
  seguranca: 'Cancele quando quiser',
}

export const PLANOS: readonly Plano[] = [PLANO_MENSAL, PLANO_VITALICIO]

/**
 * Quantos meses de assinatura custam o mesmo que o vitalício.
 *
 * É o número que faz a decisão ser fácil, e por isso aparece no cartão do
 * vitalício. Calculado, não escrito à mão: mudar qualquer um dos dois preços
 * não pode deixar a página anunciando uma conta errada.
 */
export const MESES_ATE_EMPATAR = Math.ceil(PLANO_VITALICIO.preco / PLANO_MENSAL.preco)

/** Dias de garantia incondicional no vitalício. */
export const GUARANTEE_DAYS = 7

/**
 * Para onde o CTA leva. Aponta para o app, que decide entre paywall e desafio.
 */
export const CHECKOUT_HREF = '/app'

/** Contato de suporte e reembolso, usado no FAQ e nas Configurações. */
export const SUPPORT_EMAIL = 'eu.marcussouza@gmail.com'

/**
 * Âncora de preço usada na copy. Assinaturas de apps de finanças no Brasil
 * ficam nessa faixa por MÊS — é a comparação que torna a oferta barata.
 */
export const MONTHLY_ANCHOR_BRL = 14.9
