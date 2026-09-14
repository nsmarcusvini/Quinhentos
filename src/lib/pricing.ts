/**
 * Oferta do produto em um lugar só. Preço aparece em 6 pontos da landing e no
 * paywall — mudar aqui muda em todos, sem risco de a página anunciar um valor
 * e o checkout cobrar outro.
 */

/** Pagamento único, acesso vitalício. */
export const PRICE_BRL = 19.9

/** Dias de garantia incondicional. */
export const GUARANTEE_DAYS = 7

/**
 * Para onde o CTA leva. Hoje aponta para o app, que decide entre paywall e
 * desafio. Quando o Stripe entrar, vira a URL do Checkout e a landing inteira
 * acompanha.
 */
export const CHECKOUT_HREF = '/app'

/** Contato de suporte e reembolso, usado no FAQ e nas Configurações. */
export const SUPPORT_EMAIL = 'eu.marcussouza@gmail.com'

/**
 * Âncora de preço usada na copy. Assinaturas de apps de finanças no Brasil
 * ficam nessa faixa por MÊS — é a comparação que torna R$ 19,90 barato.
 */
export const MONTHLY_ANCHOR_BRL = 14.9
