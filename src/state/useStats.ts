import { useMemo } from 'react'
import { DAY_IN_MS, daysBetween, formatDate, startOfDay, toDayKey } from '../lib/date'
import { HOUSE_COUNT, HOUSE_NUMBERS, TOTAL_AMOUNT } from '../lib/constants'
import { MILESTONES, type Milestone } from '../lib/milestones'
import { useChallenge } from './ChallengeContext'

export interface HistoryItem {
  number: number
  at: number
}

export interface ChartPoint {
  /** "AAAA-MM-DD" — usado como chave/ordenação. */
  day: string
  /** Rótulo curto para o eixo X. */
  label: string
  /** Total acumulado ao fim daquele dia. */
  total: number
  /** Casinhas marcadas naquele dia. */
  count: number
}

export interface ChallengeStats {
  markedNumbers: number[]
  pendingNumbers: number[]
  markedCount: number
  pendingCount: number
  saved: number
  remaining: number
  /** Fração de 0 a 1 do valor guardado (não de casinhas). */
  ratio: number
  largestPending: number | null
  smallestPending: number | null
  firstEntryAt: number | null
  lastEntryAt: number | null
  activeDays: number
  weeklyAverage: number
  dailyAverage: number
  /** Timestamp estimado de conclusão no ritmo atual, ou null sem ritmo medido. */
  projectedFinishAt: number | null
  streakDays: number
  history: HistoryItem[]
  chart: ChartPoint[]
  reached: Milestone[]
  next: Milestone | null
  isComplete: boolean
}

/** Todos os números derivados do desafio. Nada aqui é persistido. */
export function useStats(): ChallengeStats {
  const { entries } = useChallenge()

  return useMemo<ChallengeStats>(() => {
    const markedNumbers: number[] = []
    const pendingNumbers: number[] = []

    for (const houseNumber of HOUSE_NUMBERS) {
      if (entries[houseNumber] === undefined) pendingNumbers.push(houseNumber)
      else markedNumbers.push(houseNumber)
    }

    const saved = markedNumbers.reduce((sum, value) => sum + value, 0)
    const remaining = TOTAL_AMOUNT - saved
    const markedCount = markedNumbers.length
    const pendingCount = HOUSE_COUNT - markedCount

    const history: HistoryItem[] = markedNumbers
      .map((number) => ({ number, at: entries[number] as number }))
      .sort((a, b) => b.at - a.at || b.number - a.number)

    const firstEntryAt = history.length > 0 ? (history[history.length - 1] as HistoryItem).at : null
    const lastEntryAt = history.length > 0 ? (history[0] as HistoryItem).at : null

    // --- ritmo -------------------------------------------------------------
    const now = Date.now()
    const activeDays =
      firstEntryAt === null ? 0 : Math.max(1, daysBetween(firstEntryAt, now) + 1)
    const dailyAverage = activeDays > 0 ? saved / activeDays : 0
    const weeklyAverage = dailyAverage * 7
    const projectedFinishAt =
      dailyAverage > 0 && remaining > 0
        ? startOfDay(now) + Math.ceil(remaining / dailyAverage) * DAY_IN_MS
        : null

    // --- gráfico de acumulado ---------------------------------------------
    const perDay = new Map<string, { amount: number; count: number }>()
    for (const item of history) {
      const key = toDayKey(item.at)
      const bucket = perDay.get(key)
      if (bucket) {
        bucket.amount += item.number
        bucket.count += 1
      } else {
        perDay.set(key, { amount: item.number, count: 1 })
      }
    }

    let running = 0
    const chart: ChartPoint[] = [...perDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, bucket]) => {
        running += bucket.amount
        return {
          day,
          label: formatDate(new Date(`${day}T12:00:00`)).replace(/\sde\s/g, ' '),
          total: running,
          count: bucket.count,
        }
      })

    // --- dias seguidos ------------------------------------------------------
    const today = startOfDay(now)
    let streakDays = 0
    if (perDay.size > 0) {
      // A sequência vale se houve marcação hoje ou ontem (o dia ainda não acabou).
      const hasToday = perDay.has(toDayKey(today))
      const hasYesterday = perDay.has(toDayKey(today - DAY_IN_MS))
      if (hasToday || hasYesterday) {
        let cursor = hasToday ? today : today - DAY_IN_MS
        while (perDay.has(toDayKey(cursor))) {
          streakDays += 1
          cursor = startOfDay(cursor - DAY_IN_MS)
        }
      }
    }

    const reached = MILESTONES.filter((milestone) => saved >= milestone.amount)

    return {
      markedNumbers,
      pendingNumbers,
      markedCount,
      pendingCount,
      saved,
      remaining,
      ratio: saved / TOTAL_AMOUNT,
      largestPending: pendingCount > 0 ? (pendingNumbers[pendingCount - 1] as number) : null,
      smallestPending: pendingCount > 0 ? (pendingNumbers[0] as number) : null,
      firstEntryAt,
      lastEntryAt,
      activeDays,
      weeklyAverage,
      dailyAverage,
      projectedFinishAt,
      streakDays,
      history,
      chart,
      reached,
      next: MILESTONES.find((milestone) => saved < milestone.amount) ?? null,
      isComplete: markedCount === HOUSE_COUNT,
    }
  }, [entries])
}
