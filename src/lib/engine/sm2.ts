import type { SM2State, SM2Result } from './types'

export function calculateSM2(
  quality: number, // 1 to 5
  currentState: SM2State,
  now = new Date()
): SM2Result {
  // Clamp quality between 1 and 5
  const q = Math.max(1, Math.min(5, Math.round(quality)))
  
  let { easinessFactor: ef, interval, repetitions: rep } = currentState

  // Update Easiness Factor (EF)
  // Standard SM-2 formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  ef = Math.max(1.3, ef) // Clamp EF to a minimum of 1.3

  if (q >= 3) {
    // Successful recall
    if (rep === 0) {
      interval = 1
    } else if (rep === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * ef)
    }
    rep += 1
  } else {
    // Repetition failed (blackout / incorrect recall)
    rep = 0
    interval = 1
  }

  // Calculate new due date
  const dueDate = new Date(now.getTime())
  dueDate.setDate(dueDate.getDate() + interval)

  return {
    easinessFactor: ef,
    interval,
    repetitions: rep,
    dueDate: dueDate.toISOString(),
  }
}
