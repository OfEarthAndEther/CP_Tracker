import type { BlindSpotTopic, RedFlag, TopicPerformanceStat } from './types'

export type BlindSpotProblemRecord = {
  id: string
  title: string
  taxonomy_tags: string[] | null
  platform: 'codeforces' | 'leetcode'
  normalized_rating: number
}

export type BlindSpotSubmissionRecord = {
  id: string
  submitted_at: string
  verdict: string
  problem_id: string
  problems?: BlindSpotProblemRecord | null
}

type TopicFrequencyMap = Record<string, number>

export interface BlindSpotDetectionResult {
  topicStats: TopicPerformanceStat[]
  redFlags: RedFlag[]
  opportunityGaps: BlindSpotTopic[]
}

function normalizeTags(tags: string[] | null | undefined): string[] {
  if (!tags || tags.length === 0) {
    return ['Uncategorized']
  }

  return tags.map((tag) => tag.trim()).filter(Boolean)
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

function buildTopicFrequencies(problems: BlindSpotProblemRecord[]): TopicFrequencyMap {
  const frequencyMap: TopicFrequencyMap = {}

  for (const problem of problems) {
    const tags = normalizeTags(problem?.taxonomy_tags)

    for (const tag of tags) {
      frequencyMap[tag] = (frequencyMap[tag] || 0) + 1
    }
  }

  return frequencyMap
}

function calculateHighFrequencyThreshold(frequencies: number[]): number {
  if (frequencies.length === 0) {
    return Number.POSITIVE_INFINITY
  }

  const sorted = [...frequencies].sort((left, right) => right - left)
  const quartileIndex = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.25))

  return Math.max(5, sorted[quartileIndex] ?? 0)
}

function createRedFlag(topic: TopicPerformanceStat): RedFlag | null {
  const issueParts: string[] = []

  if (topic.successRate < 50) {
    issueParts.push(`success rate is ${topic.successRate.toFixed(1)}%`)
  }

  if (topic.averageSolveTimeMinutes !== null && topic.averageSolveTimeMinutes > 45) {
    issueParts.push(`average solve time is ${topic.averageSolveTimeMinutes.toFixed(1)} minutes`)
  }

  if (issueParts.length === 0) {
    return null
  }

  return {
    id: `topic-blind-spot-${topic.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    type: 'topic_blind_spot',
    title: `${topic.topic} needs attention`,
    description: `${issueParts.join(' and ')} across ${topic.attempts} attempts.`,
    severity: topic.successRate < 35 || (topic.averageSolveTimeMinutes ?? 0) > 60 ? 'critical' : 'warning',
    affectedTopics: [topic.topic],
    recommendedAction:
      topic.successRate < 50
        ? 'Revisit the topic from fundamentals and solve 2-3 carefully selected problems.'
        : 'Focus on timed practice to reduce solve latency and reinforce patterns.',
  }
}

function toTopicStats(submissions: BlindSpotSubmissionRecord[]): TopicPerformanceStat[] {
  const topicStats = new Map<
    string,
    {
      attempts: number
      acceptedAttempts: number
      solveTimeTotalMinutes: number
      solveTimeSamples: number
      lastAttemptAt: string | null
      lastAcceptedAt: string | null
      solvedProblems: Map<string, { firstAttemptAt: string; firstAcceptedAt: string | null }>
    }
  >()

  for (const submission of submissions) {
    const tags = normalizeTags(submission.problems?.taxonomy_tags)
    const submittedAt = submission.submitted_at

    for (const topic of tags) {
      const current = topicStats.get(topic) ?? {
        attempts: 0,
        acceptedAttempts: 0,
        solveTimeTotalMinutes: 0,
        solveTimeSamples: 0,
        lastAttemptAt: null,
        lastAcceptedAt: null,
        solvedProblems: new Map<string, { firstAttemptAt: string; firstAcceptedAt: string | null }>(),
      }

      current.attempts += 1
      current.lastAttemptAt = !current.lastAttemptAt || current.lastAttemptAt < submittedAt ? submittedAt : current.lastAttemptAt

      const tracker = current.solvedProblems.get(submission.problem_id) ?? {
        firstAttemptAt: submittedAt,
        firstAcceptedAt: null,
      }

      tracker.firstAttemptAt = tracker.firstAttemptAt < submittedAt ? tracker.firstAttemptAt : submittedAt

      if (submission.verdict === 'ACCEPTED') {
        current.acceptedAttempts += 1
        current.lastAcceptedAt = !current.lastAcceptedAt || current.lastAcceptedAt < submittedAt ? submittedAt : current.lastAcceptedAt

        if (!tracker.firstAcceptedAt || tracker.firstAcceptedAt > submittedAt) {
          tracker.firstAcceptedAt = submittedAt
        }
      }

      current.solvedProblems.set(submission.problem_id, tracker)
      topicStats.set(topic, current)
    }
  }

  for (const [topic, stat] of topicStats.entries()) {
    for (const tracker of stat.solvedProblems.values()) {
      if (!tracker.firstAcceptedAt) {
        continue
      }

      const solveTimeMinutes = Math.max(
        0,
        (new Date(tracker.firstAcceptedAt as string).getTime() - new Date(tracker.firstAttemptAt).getTime()) /
          60000,
      )

      stat.solveTimeTotalMinutes += solveTimeMinutes
      stat.solveTimeSamples += 1
    }

    topicStats.set(topic, stat)
  }

  return Array.from(topicStats.entries()).map(([topic, stat]) => ({
    topic,
    attempts: stat.attempts,
    solvedCount: Array.from(stat.solvedProblems.values()).filter((tracker) => Boolean(tracker.firstAcceptedAt)).length,
    successRate: stat.attempts === 0 ? 0 : (stat.acceptedAttempts / stat.attempts) * 100,
    averageSolveTimeMinutes: stat.solveTimeSamples > 0 ? stat.solveTimeTotalMinutes / stat.solveTimeSamples : null,
    lastAttemptAt: stat.lastAttemptAt,
    lastAcceptedAt: stat.lastAcceptedAt,
    globalFrequency: 0,
  }))
}

function toOpportunityGap(
  topic: TopicPerformanceStat,
  globalFrequency: number,
  frequencyThreshold: number,
): BlindSpotTopic | null {
  if (globalFrequency < frequencyThreshold) {
    return null
  }

  const daysSinceLastAttempt = topic.lastAttemptAt ? getDaysSince(topic.lastAttemptAt) : null

  if (daysSinceLastAttempt !== null && daysSinceLastAttempt <= 21) {
    return null
  }

  return {
    topic: topic.topic,
    category: 'opportunity_gap',
    title: `${topic.topic} has gone cold`,
    description:
      daysSinceLastAttempt === null
        ? `You have not practiced ${topic.topic} yet despite it being common in the problem vault.`
        : `You have not practiced ${topic.topic} in ${daysSinceLastAttempt} days despite it appearing ${globalFrequency} times in the problem vault.`,
    severity: 'warning',
    attempts: topic.attempts,
    successRate: topic.successRate,
    averageSolveTimeMinutes: topic.averageSolveTimeMinutes,
    lastAttemptAt: topic.lastAttemptAt,
    daysSinceLastAttempt,
    globalFrequency,
    recommendedAction: 'Queue one representative problem from this topic to restore recall.',
  }
}

/**
 * Detect topic-level blind spots, red flags, and opportunity gaps from submission history.
 */
export function detectBlindSpots(
  submissions: BlindSpotSubmissionRecord[],
  allProblems: BlindSpotProblemRecord[],
): BlindSpotDetectionResult {
  const topicStats = toTopicStats(submissions)
  const topicFrequencies = buildTopicFrequencies(allProblems)
  const frequencyThreshold = calculateHighFrequencyThreshold(Object.values(topicFrequencies))

  const enrichedTopicStats = topicStats.map((topic) => ({
    ...topic,
    globalFrequency: topicFrequencies[topic.topic] ?? 0,
  }))

  const redFlags = enrichedTopicStats
    .map((topic) => createRedFlag(topic))
    .filter((flag): flag is RedFlag => flag !== null)

  const opportunityGaps = enrichedTopicStats
    .map((topic) => {
      return toOpportunityGap(topic, topic.globalFrequency, frequencyThreshold)
    })
    .filter((gap): gap is BlindSpotTopic => gap !== null)

  return {
    topicStats: enrichedTopicStats,
    redFlags,
    opportunityGaps,
  }
}