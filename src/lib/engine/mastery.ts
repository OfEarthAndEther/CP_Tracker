import type { ProblemMasteryInput } from './types'

/**
 * Calculates user's baseline skill based on solved problem ratings.
 * Default rating fallback is 1200 if no solved problems exist.
 */
export function calculateBaselineRating(solvedRatings: number[]): number {
  if (solvedRatings.length === 0) return 1200
  const sum = solvedRatings.reduce((a, b) => a + b, 0)
  return Math.round(sum / solvedRatings.length)
}

/**
 * Calculates initial item-level mastery (0 - 100) factoring in difficulty delta and independence.
 */
export function calculateItemMastery(input: ProblemMasteryInput): number {
  const { problemRating, userBaselineRating, incorrectAttemptsBeforeSolve } = input

  // 1. Independence Factor: solves on first attempt get 1.0. Deduct 15% per incorrect attempt.
  const independence = Math.max(0.2, 1.0 - 0.15 * incorrectAttemptsBeforeSolve)

  // 2. Difficulty Delta: solved problems harder than baseline rating boost initial mastery.
  const delta = problemRating - userBaselineRating
  
  // Use hyperbolic tangent to clamp difficulty multiplier boost between 0.8 and 1.2
  const difficultyMultiplier = 1.0 + Math.tanh(delta / 800) * 0.2

  // Base mastery is 90% for a clean solve
  const baseMastery = 90

  const mastery = baseMastery * independence * difficultyMultiplier
  return Math.min(100, Math.max(0, Math.round(mastery)))
}
