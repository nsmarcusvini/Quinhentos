/** Quantidade de casinhas do desafio. */
export const HOUSE_COUNT = 500

/** Lista imutável com os números de 1 a 500, usada para renderizar o grid. */
export const HOUSE_NUMBERS: readonly number[] = Object.freeze(
  Array.from({ length: HOUSE_COUNT }, (_, index) => index + 1),
)

/**
 * Soma de 1 até 500 pela fórmula de Gauss: n * (n + 1) / 2.
 * 500 * 501 / 2 = 125.250 — conferido também por soma iterativa no teste abaixo.
 */
export const TOTAL_AMOUNT = (HOUSE_COUNT * (HOUSE_COUNT + 1)) / 2

if (import.meta.env.DEV) {
  const bruteForce = HOUSE_NUMBERS.reduce((sum, value) => sum + value, 0)
  if (bruteForce !== TOTAL_AMOUNT || TOTAL_AMOUNT !== 125_250) {
    throw new Error(
      `Total do desafio inconsistente: fórmula=${TOTAL_AMOUNT}, soma=${bruteForce}, esperado=125250`,
    )
  }
}

export const STORAGE_KEY = 'desafio500:state'
export const STATE_VERSION = 2

export const DEFAULT_CHALLENGE_NAME = 'Meu Desafio 500'
