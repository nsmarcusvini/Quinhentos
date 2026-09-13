const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const currencyCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const percent = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

const decimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** R$ 1.234,00 */
export const formatCurrency = (value: number): string => currency.format(value)

/** R$ 1.234 — para espaços apertados (chips, eixos de gráfico, badges). */
export const formatCurrencyCompact = (value: number): string => currencyCompact.format(value)

/** 0.4235 → "42,4%" */
export const formatPercent = (ratio: number): string => percent.format(ratio)

export const formatInteger = (value: number): string => integer.format(value)

export const formatDecimal = (value: number): string => decimal.format(value)

/** "1 casinha" / "12 casinhas" */
export const pluralize = (count: number, singular: string, plural: string): string =>
  `${formatInteger(count)} ${count === 1 ? singular : plural}`
