import type {
  AggregateStats,
  RecognitionLogEntry,
  RecognitionSummary,
  SessionKanaReview,
} from '@/types/training'
import { calcAvg } from '@/lib/utils'

export function createAggregateStats(total: number, correct: number, times: number[]): AggregateStats {
  return {
    total,
    correct,
    accuracy: total ? (correct / total) * 100 : 0,
    averageMs: calcAvg(times),
  }
}

export function hasMetMasteryTarget(stats: AggregateStats) {
  return stats.total >= 200 && stats.accuracy >= 98 && stats.averageMs <= 500
}

export function buildSessionBreakdown(logs: RecognitionLogEntry[]): SessionKanaReview[] {
  const byKana = new Map<
    string,
    {
      kana: string
      romaji: string
      total: number
      correct: number
      times: number[]
    }
  >()

  for (const entry of logs) {
    const key = entry.kana
    const existing = byKana.get(key)

    if (existing) {
      existing.total += 1
      if (entry.ok) {
        existing.correct += 1
      }
      if (typeof entry.reactionMs === 'number' && Number.isFinite(entry.reactionMs)) {
        existing.times.push(entry.reactionMs)
      }
      continue
    }

    byKana.set(key, {
      kana: entry.kana,
      romaji: entry.romaji,
      total: 1,
      correct: entry.ok ? 1 : 0,
      times:
        typeof entry.reactionMs === 'number' && Number.isFinite(entry.reactionMs)
          ? [entry.reactionMs]
          : [],
    })
  }

  return Array.from(byKana.values()).map((item) => ({
    kana: item.kana,
    romaji: item.romaji,
    total: item.total,
    correct: item.correct,
    wrong: item.total - item.correct,
    accuracy: item.total ? (item.correct / item.total) * 100 : 0,
    averageMs: calcAvg(item.times),
    bestMs: item.times.length ? Math.min(...item.times) : null,
    worstMs: item.times.length ? Math.max(...item.times) : null,
  }))
}

export function buildRecognitionSummary(logs: RecognitionLogEntry[]): RecognitionSummary {
  const total = logs.length
  const correct = logs.filter((entry) => entry.ok).length
  const wrong = total - correct
  const times = logs
    .map((entry) => entry.reactionMs)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

  const breakdown = buildSessionBreakdown(logs)

  return {
    total,
    correct,
    wrong,
    accuracy: total ? (correct / total) * 100 : 0,
    averageMs: calcAvg(times),
    bestMs: times.length ? Math.min(...times) : null,
    worstMs: times.length ? Math.max(...times) : null,
    weakest: breakdown
      .filter((item) => item.total >= 2 && item.accuracy < 100)
      .sort((left, right) => left.accuracy - right.accuracy || right.averageMs - left.averageMs)
      .slice(0, 5),
    slowest: breakdown
      .filter((item) => Number.isFinite(item.averageMs))
      .sort((left, right) => right.averageMs - left.averageMs)
      .slice(0, 5),
  }
}
