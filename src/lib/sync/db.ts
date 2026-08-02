import { supabase } from '../supabase'
import type { NormalizedProblem, NormalizedSubmission } from './types'

export async function fetchExistingProblems(problemIds: string[]): Promise<Set<string>> {
  if (problemIds.length === 0) return new Set()

  const { data, error } = await supabase
    .from('problems')
    .select('id')
    .in('id', problemIds)

  if (error) {
    console.error('Error fetching existing problems:', error)
    return new Set()
  }

  return new Set((data || []).map((p) => p.id))
}

export async function upsertProblems(problems: NormalizedProblem[]): Promise<{ error: unknown }> {
  if (problems.length === 0) return { error: null }

  const { error } = await supabase
    .from('problems')
    .upsert(problems, { onConflict: 'id' })

  return { error }
}

export async function insertSubmissions(
  submissions: NormalizedSubmission[]
): Promise<{ insertedCount: number; error: unknown }> {
  if (submissions.length === 0) return { insertedCount: 0, error: null }

  const userId = submissions[0].user_id

  // To avoid duplicates, we fetch the existing submissions for this user.
  // Note: Since there could be a large number of submissions over time, we filter by problem_id.
  const problemIds = Array.from(new Set(submissions.map((s) => s.problem_id)))
  
  const { data: existing, error: selectError } = await supabase
    .from('submissions')
    .select('problem_id, submitted_at')
    .eq('user_id', userId)
    .in('problem_id', problemIds)

  if (selectError) {
    return { insertedCount: 0, error: selectError }
  }

  const existingKeys = new Set(
    (existing || []).map((s) => `${s.problem_id}_${new Date(s.submitted_at).getTime()}`)
  )

  const toInsert = submissions.filter(
    (s) => !existingKeys.has(`${s.problem_id}_${new Date(s.submitted_at).getTime()}`)
  )

  if (toInsert.length === 0) {
    return { insertedCount: 0, error: null }
  }

  const { error } = await supabase
    .from('submissions')
    .insert(toInsert)

  return { insertedCount: toInsert.length, error }
}
