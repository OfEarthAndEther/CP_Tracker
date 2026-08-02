import { supabase } from '../supabase'
import { calculateBaselineRating } from './mastery'
import { calculateSM2 } from './sm2'
import type { SM2State } from './types'

interface ProblemsWithRating {
  normalized_rating: number
}

/**
 * Returns user baseline rating by computing the average of all solved problems.
 */
export async function getUserBaseline(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('submissions')
    .select('problem_id, verdict, problems(normalized_rating)')
    .eq('user_id', userId)

  if (error || !data) return 1200

  const solvedRatings = data
    .filter((s) => s.verdict === 'ACCEPTED' && s.problems)
    .map((s) => (s.problems as unknown as ProblemsWithRating).normalized_rating)

  return calculateBaselineRating(solvedRatings)
}

/**
 * Recalculates and upserts a problem's Spaced Repetition status on SM-2 feedback.
 */
export async function updateProblemRepetitionState(
  userId: string,
  problemId: string,
  quality: number,
  now = new Date()
): Promise<void> {
  // 1. Fetch current review state for the problem
  const { data: currentItem, error: fetchError } = await supabase
    .from('review_items')
    .select('easiness_factor, interval, repetitions')
    .eq('user_id', userId)
    .eq('problem_id', problemId)
    .maybeSingle()

  if (fetchError) {
    console.error('Error fetching review item:', fetchError)
    return
  }

  const currentState: SM2State = currentItem
    ? {
        easinessFactor: currentItem.easiness_factor,
        interval: currentItem.interval,
        repetitions: currentItem.repetitions,
      }
    : { easinessFactor: 2.5, interval: 0, repetitions: 0 }

  // 2. Perform SM-2 Calculation
  const result = calculateSM2(quality, currentState, now)

  // 3. Upsert State
  const { error: upsertError } = await supabase
    .from('review_items')
    .upsert({
      user_id: userId,
      problem_id: problemId,
      easiness_factor: result.easinessFactor,
      interval: result.interval,
      repetitions: result.repetitions,
      due_date: result.dueDate,
      last_reviewed_at: now.toISOString(),
    }, { onConflict: 'user_id,problem_id' })

  if (upsertError) {
    console.error('Error updating review item:', upsertError)
  }
}
