import type { TopicHealthInput } from './types'

/**
 * Calculates continuous topic health index (0 - 100) using half-life decay formula:
 * H(t) = H_0 * (0.5) ^ (Δt / λ)
 */
export function calculateTopicHealth(input: TopicHealthInput): number {
  const { initialMastery, daysElapsed, halfLife } = input
  if (daysElapsed <= 0) return Math.min(100, Math.max(0, initialMastery))

  const decay = initialMastery * Math.pow(0.5, daysElapsed / halfLife)
  return Math.min(100, Math.max(0, Math.round(decay)))
}

/**
 * Computes stability half-life (in days) based on repetition count.
 * Stability increases as the topic is reviewed more times.
 */
export function calculateStabilityHalfLife(repetitions: number): number {
  // Repetition stability growth: 3 -> 7 -> 15 -> 30 days
  if (repetitions <= 0) return 3
  if (repetitions === 1) return 7
  if (repetitions === 2) return 15
  return 30
}
