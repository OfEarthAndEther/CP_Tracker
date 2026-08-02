import type { AnalyticsSummary, TopicMastery, SolveVelocity, PlatformDistribution, VerdictBreakdown } from './types'

interface RawSubmission {
  id: string
  verdict: string
  created_at: string
  platform: 'leetcode' | 'codeforces'
  incorrect_attempts?: number
  problems?: {
    normalized_rating?: number
    taxonomy_tags?: string[]
  }
}

export function aggregateAnalytics(submissions: RawSubmission[]): AnalyticsSummary {
  const topicMap: Record<string, { solves: number; totalAttempts: number }> = {}
  const velocityMap: Record<string, number> = {}
  const platformMap: Record<string, number> = { leetcode: 0, codeforces: 0 }
  const verdictMap: Record<string, number> = {}

  for (const sub of submissions) {
    // 1. Verdict Breakdown
    verdictMap[sub.verdict] = (verdictMap[sub.verdict] || 0) + 1

    // 2. Platform Distribution
    if (sub.platform) {
      platformMap[sub.platform] = (platformMap[sub.platform] || 0) + 1
    }

    if (sub.verdict === 'ACCEPTED') {
      // 3. Solve Velocity (by Date)
      const dateStr = sub.created_at.split('T')[0]
      velocityMap[dateStr] = (velocityMap[dateStr] || 0) + 1

      // 4. Topic Aggregation
      const tags = sub.problems?.taxonomy_tags || ['Uncategorized']
      const attempts = (sub.incorrect_attempts || 0) + 1

      for (const tag of tags) {
        if (!topicMap[tag]) topicMap[tag] = { solves: 0, totalAttempts: 0 }
        topicMap[tag].solves += 1
        topicMap[tag].totalAttempts += attempts
      }
    }
  }

  const topicMastery: TopicMastery[] = Object.entries(topicMap).map(([topic, stat]) => ({
    topic,
    solvedCount: stat.solves,
    avgAttempts: Math.round((stat.totalAttempts / stat.solves) * 10) / 10,
    masteryScore: Math.min(100, stat.solves * 10), // Basic mastery metric
    topicHealth: 75, // Default baseline health
  }))

  const solveVelocity: SolveVelocity[] = Object.entries(velocityMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))

  const platformDistribution: PlatformDistribution[] = [
    { platform: 'leetcode', solvedCount: platformMap.leetcode || 0 },
    { platform: 'codeforces', solvedCount: platformMap.codeforces || 0 },
  ]

  const verdictBreakdown: VerdictBreakdown[] = Object.entries(verdictMap).map(([verdict, count]) => ({
    verdict,
    count,
  }))

  return {
    topicMastery,
    solveVelocity,
    ratingProgression: [],
    platformDistribution,
    verdictBreakdown,
  }
}