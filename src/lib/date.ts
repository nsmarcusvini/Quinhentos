const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const longDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export const DAY_IN_MS = 24 * 60 * 60 * 1000

export const formatDate = (value: number | Date): string => dateFormatter.format(value)
export const formatDateTime = (value: number | Date): string => dateTimeFormatter.format(value)
export const formatLongDate = (value: number | Date): string => longDateFormatter.format(value)

/** Chave "AAAA-MM-DD" no fuso local — usada para agrupar lançamentos por dia. */
export function toDayKey(value: number | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Meia-noite local do dia informado. */
export function startOfDay(value: number | Date): number {
  const date = value instanceof Date ? new Date(value) : new Date(value)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function addDays(value: number | Date, days: number): number {
  const date = value instanceof Date ? new Date(value) : new Date(value)
  date.setDate(date.getDate() + days)
  return date.getTime()
}

/** Diferença em dias inteiros entre dois instantes (ignorando as horas). */
export function daysBetween(from: number | Date, to: number | Date): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_IN_MS)
}

/** Converte "AAAA-MM-DD" em timestamp local; null se a string for inválida. */
export function parseDateInput(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return Number.isNaN(date.getTime()) ? null : date.getTime()
}

/** Timestamp → "AAAA-MM-DD" para <input type="date">. */
export const toDateInputValue = (value: number | Date): string => toDayKey(value)
