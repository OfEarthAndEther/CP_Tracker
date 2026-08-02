import { createClient } from '@supabase/supabase-js'

import {
  calculateNextReview,
  buildStreakSummary,
  detectBlindSpots,
  type BlindSpotProblemRecord,
  type BlindSpotSubmissionRecord,
  type InsightsSnapshot,
  type RevisionDeckItem,
  type SpacedRepetitionOutput,
  type TopicMasteryPoint,
} from '../../../../src/lib/analytics'

type RouteReviewItem = {
  id: string
  problem_id: string
  easiness_factor: number
  interval: number
  repetitions: number
  due_date: string
  last_reviewed_at: string | null
  problems?: {
    id: string
    title: string
    url: string
    platform: 'codeforces' | 'leetcode'
    normalized_rating: number
    taxonomy_tags: string[] | null
  } | null
}

type RouteSubmission = {
  id: string
  submitted_at: string
  verdict: string
  problem_id: string
  execution_time_ms: number | null
  problems?: {
    id: string
    title: string
    url: string
    platform: 'codeforces' | 'leetcode'
    normalized_rating: number
    taxonomy_tags: string[] | null
  } | null
}

type RouteProblem = {
  id: string
  platform: 'codeforces' | 'leetcode'
  external_id: string
  title: string
  url: string
  normalized_rating: number
  taxonomy_tags: string[] | null
}

function requireEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }

  return value
}

function buildServerClient(request: Request) {
  const supabaseUrl = requireEnv('VITE_SUPABASE_URL')
  const supabaseAnonKey = requireEnv('VITE_SUPABASE_ANON_KEY')
  const authorization = request.headers.get('authorization') ?? ''

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authorization ? { Authorization: authorization } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function getUtcDayEnd(reference = new Date()): Date {
  const endOfDay = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate(), 23, 59, 59, 999))
  return endOfDay
}

function getDaysSince(isoValue: string, referenceDate = new Date()): number {
  const reference = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
  )
  const value = new Date(isoValue)
  const candidate = Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())

  return Math.max(0, Math.floor((reference - candidate) / 86_400_000))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function buildRevisionDeck(reviewItems: RouteReviewItem[]): RevisionDeckItem[] {
  const now = new Date()

  return reviewItems
    .filter((item) => new Date(item.due_date).getTime() <= getUtcDayEnd(now).getTime())
    .map((item) => {
      const projection: SpacedRepetitionOutput = calculateNextReview({
        confidence: 3,
        repetitions: item.repetitions,
        previousEaseFactor: item.easiness_factor,
        previousInterval: item.interval,
      })

      const tags = item.problems?.taxonomy_tags ?? []

      return {
        id: item.id,
        problemId: item.problem_id,
        title: item.problems?.title ?? 'Untitled problem',
        url: item.problems?.url ?? '#',
        platform: item.problems?.platform ?? 'leetcode',
        taxonomyTags: tags,
        reviewDate: projection.reviewDate,
        dueDate: item.due_date,
        repetitions: item.repetitions,
        intervalDays: item.interval,
        easeFactor: item.easiness_factor,
        daysOverdue: Math.max(0, Math.floor((Date.now() - new Date(item.due_date).getTime()) / 86_400_000)),
      }
    })
    .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())
}

function buildMasteryDistribution(
  topicStats: ReturnType<typeof detectBlindSpots>['topicStats'],
  revisionDeck: RevisionDeckItem[],
): TopicMasteryPoint[] {
  const queuedTopics = new Map<string, number>()

  for (const item of revisionDeck) {
    for (const topic of item.taxonomyTags) {
      queuedTopics.set(topic, (queuedTopics.get(topic) ?? 0) + 1)
    }
  }

  return topicStats
    .map((topic) => {
      const recencyScore = topic.lastAttemptAt ? clamp(100 - getDaysSince(topic.lastAttemptAt) * 4, 0, 100) : 0
      const speedScore =
        topic.averageSolveTimeMinutes === null
          ? 0
          : clamp(100 - (topic.averageSolveTimeMinutes / 45) * 100, 0, 100)
      const consistencyScore = clamp(Math.log10(topic.attempts + 1) * 45, 0, 100)
      const revisionPenalty = clamp((queuedTopics.get(topic.topic) ?? 0) * 8, 0, 24)

      const masteryScore = Math.round(
        clamp(
          topic.successRate * 0.5 + recencyScore * 0.2 + speedScore * 0.2 + consistencyScore * 0.1 - revisionPenalty,
          0,
          100,
        ),
      )

      return {
        topic: topic.topic,
        masteryScore,
        accuracyRate: Math.round(topic.successRate),
        averageSolveTimeMinutes: topic.averageSolveTimeMinutes,
        solvedCount: topic.solvedCount,
        attempts: topic.attempts,
      }
    })
    .sort((left, right) => right.masteryScore - left.masteryScore)
}

export async function GET(request: Request): Promise<Response> {
  try {
    const supabase = buildServerClient(request)
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [reviewItemsResult, submissionsResult, problemsResult] = await Promise.all([
      supabase
        .from('review_items')
        .select('id, problem_id, easiness_factor, interval, repetitions, due_date, last_reviewed_at, problems:problem_id (id, title, url, platform, normalized_rating, taxonomy_tags)')
        .eq('user_id', userData.user.id)
        .order('due_date', { ascending: true }),
      supabase
        .from('submissions')
        .select('id, submitted_at, verdict, problem_id, execution_time_ms, problems:problem_id (id, title, url, platform, normalized_rating, taxonomy_tags)')
        .eq('user_id', userData.user.id)
        .order('submitted_at', { ascending: true }),
      supabase
        .from('problems')
        .select('id, platform, external_id, title, url, normalized_rating, taxonomy_tags')
        .order('title', { ascending: true }),
    ])

    if (reviewItemsResult.error) {
      throw reviewItemsResult.error
    }

    if (submissionsResult.error) {
      throw submissionsResult.error
    }

    if (problemsResult.error) {
      throw problemsResult.error
    }

    const reviewItems = (reviewItemsResult.data ?? []) as RouteReviewItem[]
    const submissions = (submissionsResult.data ?? []) as RouteSubmission[]
    const problems = (problemsResult.data ?? []) as RouteProblem[]

    const blindSpotSeed = detectBlindSpots(
      submissions as BlindSpotSubmissionRecord[],
      problems.map((problem) => ({
        id: problem.id,
        title: problem.title,
        taxonomy_tags: problem.taxonomy_tags ?? [],
        platform: problem.platform,
        normalized_rating: problem.normalized_rating,
      })) as BlindSpotProblemRecord[],
    )
    const revisionQueue = buildRevisionDeck(reviewItems)
    const masteryDistribution = buildMasteryDistribution(blindSpotSeed.topicStats, revisionQueue)
    const streak = buildStreakSummary(submissions)

    const response: InsightsSnapshot = {
      generatedAt: new Date().toISOString(),
      revisionQueue,
      blindSpots: blindSpotSeed,
      masteryDistribution,
      streak,
    }

    return Response.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected analytics failure.'
    return Response.json({ error: message }, { status: 500 })
  }
}