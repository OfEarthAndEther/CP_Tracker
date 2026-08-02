import type { SpacedRepetitionInput, SpacedRepetitionOutput } from './types'

const MIN_EASE_FACTOR = 1.3
const MIN_INTERVAL_DAYS = 1
const SHORT_INTERVAL_DAYS = 1
const MEDIUM_INTERVAL_DAYS = 6

function normalizeConfidence(confidence: number): number {
  if (!Number.isFinite(confidence)) {
    return 1
  }

  return Math.min(5, Math.max(1, Math.round(confidence)))
}

function normalizeNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback
}

function roundEaseFactor(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Calculate the next SM-2 review using the current confidence score and card state.
 */
export function calculateNextReview(input: SpacedRepetitionInput): SpacedRepetitionOutput {
  const confidence = normalizeConfidence(input.confidence)
  const repetitions = Math.max(0, Math.floor(normalizeNumber(input.repetitions, 0)))
  const previousInterval = Math.max(0, Math.floor(normalizeNumber(input.previousInterval, 0)))
  const previousEaseFactor = Math.max(MIN_EASE_FACTOR, normalizeNumber(input.previousEaseFactor, 2.5))

  const qualityPenalty = 0.1 - (5 - confidence) * (0.08 + (5 - confidence) * 0.02)
  const easeFactor = Math.max(MIN_EASE_FACTOR, previousEaseFactor + qualityPenalty)

  let intervalDays: number

  if (confidence < 3) {
    intervalDays = SHORT_INTERVAL_DAYS
  } else if (repetitions <= 0) {
    intervalDays = SHORT_INTERVAL_DAYS
  } else if (repetitions === 1) {
    intervalDays = MEDIUM_INTERVAL_DAYS
  } else {
    intervalDays = Math.max(MIN_INTERVAL_DAYS, Math.round(previousInterval * easeFactor))
  }

  const reviewDate = new Date()
  reviewDate.setUTCDate(reviewDate.getUTCDate() + intervalDays)

  return {
    reviewDate: reviewDate.toISOString(),
    easeFactor: roundEaseFactor(easeFactor),
    intervalDays,
  }
}