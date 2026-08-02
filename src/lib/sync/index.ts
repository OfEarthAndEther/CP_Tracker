import { CodeforcesSyncClient } from './codeforces'
import { LeetCodeSyncClient } from './leetcode'
import { RateLimiter } from './rateLimiter'
import {
  normalizeCodeforcesRating,
  normalizeLeetCodeDifficulty,
  normalizeVerdict,
  mapTagsToCanonical,
} from './normalizer'
import { fetchExistingProblems, upsertProblems, insertSubmissions } from './db'
import { supabase } from '../supabase'
import type { SyncResult, SyncOptions, NormalizedProblem, NormalizedSubmission } from './types'

interface RawCodeforcesSubmission {
  creationTimeSeconds: number
  verdict?: string | null
  timeConsumedMillis?: number
  memoryConsumedBytes?: number
  problem?: {
    contestId?: number
    index?: string
    name?: string
    rating?: number
    tags?: string[]
  }
}

interface RawLeetCodeSubmission {
  id?: string
  title?: string
  titleSlug?: string
  timestamp?: string
  statusDisplay?: string
  lang?: string
}

interface RawLeetCodeQuestionDetails {
  questionId?: string
  title?: string
  difficulty?: string
  topicTags?: Array<{ name: string; slug: string }>
}

const cfRateLimiter = new RateLimiter(5) // Codeforces allows 5 req/sec
const lcRateLimiter = new RateLimiter(5) // LeetCode rate limit (default to 5 req/sec)

const cfClient = new CodeforcesSyncClient(cfRateLimiter)
const lcClient = new LeetCodeSyncClient(lcRateLimiter)

export async function syncUserSubmissions(
  userId: string,
  options?: SyncOptions
): Promise<{ codeforces: SyncResult; leetcode: SyncResult }> {
  const result: { codeforces: SyncResult; leetcode: SyncResult } = {
    codeforces: { platform: 'codeforces', success: false, submissionsSynced: 0, problemsAdded: 0 },
    leetcode: { platform: 'leetcode', success: false, submissionsSynced: 0, problemsAdded: 0 },
  }

  // 1. Fetch user's profile handles and verification status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('codeforces_handle, leetcode_handle, cf_verified, lc_verified')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    const errMsg = profileError?.message ?? 'Profile not found'
    result.codeforces.error = errMsg
    result.leetcode.error = errMsg
    return result
  }

  // 2. Perform Codeforces Sync
  if (profile.codeforces_handle && profile.cf_verified) {
    try {
      const limit = options?.limit ?? (options?.forceFullSync ? 10000 : 100)
      const rawCf = (await cfClient.fetchSubmissions(
        profile.codeforces_handle,
        { count: limit }
      )) as RawCodeforcesSubmission[]

      const parsedProblems: Record<string, NormalizedProblem> = {}
      const parsedSubmissions: NormalizedSubmission[] = []

      for (const item of rawCf) {
        if (!item.problem) continue
        const index = item.problem.index ?? 'A'
        const contestId = item.problem.contestId
        const externalId = contestId !== undefined ? `${contestId}${index}` : index
        const problemId = `CF-${externalId}`

        if (!parsedProblems[problemId]) {
          parsedProblems[problemId] = {
            id: problemId,
            platform: 'codeforces',
            external_id: externalId,
            title: item.problem.name ?? `Problem ${externalId}`,
            url: contestId !== undefined
              ? `https://codeforces.com/contest/${contestId}/problem/${index}`
              : `https://codeforces.com/problemset/problem/${externalId}`,
            normalized_rating: normalizeCodeforcesRating(item.problem.rating, index),
            taxonomy_tags: mapTagsToCanonical(item.problem.tags ?? []),
          }
        }

        parsedSubmissions.push({
          user_id: userId,
          problem_id: problemId,
          submitted_at: new Date(item.creationTimeSeconds * 1000).toISOString(),
          verdict: normalizeVerdict(item.verdict, 'codeforces'),
          execution_time_ms: item.timeConsumedMillis,
          memory_bytes: item.memoryConsumedBytes,
          raw_payload: item,
        })
      }

      // Check which problems already exist in the DB
      const problemIds = Object.keys(parsedProblems)
      const existingProblemIds = await fetchExistingProblems(problemIds)
      const newProblems = Object.values(parsedProblems).filter((p) => !existingProblemIds.has(p.id))

      // Persist problems and submissions
      await upsertProblems(Object.values(parsedProblems))
      const { insertedCount, error: subError } = await insertSubmissions(parsedSubmissions)

      if (subError) throw subError

      result.codeforces.success = true
      result.codeforces.submissionsSynced = insertedCount
      result.codeforces.problemsAdded = newProblems.length
    } catch (e: unknown) {
      result.codeforces.error = e instanceof Error ? e.message : String(e)
    }
  } else {
    result.codeforces.error = 'Codeforces handle not set or not verified'
  }

  // 3. Perform LeetCode Sync
  if (profile.leetcode_handle && profile.lc_verified) {
    try {
      const limit = options?.limit ?? (options?.forceFullSync ? 100 : 20)
      const rawLc = (await lcClient.fetchRecentSubmissions(
        profile.leetcode_handle,
        limit
      )) as RawLeetCodeSubmission[]

      const parsedProblems: Record<string, NormalizedProblem> = {}
      const parsedSubmissions: NormalizedSubmission[] = []

      // Identify problem details to fetch for newly seen problems
      const titleSlugs = Array.from(
        new Set<string>(
          rawLc.map((item) => item.titleSlug).filter((slug): slug is string => !!slug)
        )
      )
      const problemIds = titleSlugs.map((slug) => `LC-${slug}`)
      const existingProblemIds = await fetchExistingProblems(problemIds)

      for (const item of rawLc) {
        if (!item.titleSlug) continue
        const problemId = `LC-${item.titleSlug}`

        if (!existingProblemIds.has(problemId) && !parsedProblems[problemId]) {
          // Fetch detailed information from GraphQL
          const details = (await lcClient.fetchQuestionDetails(item.titleSlug)) as RawLeetCodeQuestionDetails | undefined
          if (details) {
            parsedProblems[problemId] = {
              id: problemId,
              platform: 'leetcode',
              external_id: details.questionId ?? item.titleSlug,
              title: details.title ?? item.title,
              url: `https://leetcode.com/problems/${item.titleSlug}/`,
              normalized_rating: normalizeLeetCodeDifficulty(details.difficulty ?? 'Medium'),
              taxonomy_tags: mapTagsToCanonical((details.topicTags ?? []).map((t) => t.name ?? '')),
            }
          }
        }

        parsedSubmissions.push({
          user_id: userId,
          problem_id: problemId,
          submitted_at: item.timestamp
            ? new Date(parseInt(item.timestamp) * 1000).toISOString()
            : new Date().toISOString(),
          verdict: normalizeVerdict(item.statusDisplay, 'leetcode'),
          raw_payload: item,
        })
      }

      const newProblemsCount = Object.keys(parsedProblems).length
      await upsertProblems(Object.values(parsedProblems))
      const { insertedCount, error: subError } = await insertSubmissions(parsedSubmissions)

      if (subError) throw subError

      result.leetcode.success = true
      result.leetcode.submissionsSynced = insertedCount
      result.leetcode.problemsAdded = newProblemsCount
    } catch (e: unknown) {
      result.leetcode.error = e instanceof Error ? e.message : String(e)
    }
  } else {
    result.leetcode.error = 'LeetCode handle not set or not verified'
  }

  return result
}
