export type Severity = 'critical' | 'warning' | 'info'
export type RedFlagType = 'high_penalty_rate' | 'sudden_decay' | 'comfort_zone_trap' | 'avoidance_pattern'

export interface RedFlag {
  id: string
  type: RedFlagType
  title: string
  description: string
  severity: Severity
  affectedTopics: string[]
  recommendedAction: string
}

export interface TopicMastery {
  topic: string
  solvedCount: number
  avgAttempts: number
  masteryScore: number // 0 - 100
  topicHealth: number // 0 - 100
}

export interface SolveVelocity {
  date: string // YYYY-MM-DD
  count: number
}

export interface RatingProgression {
  date: string
  estimatedRating: number
}

export interface PlatformDistribution {
  platform: 'leetcode' | 'codeforces'
  solvedCount: number
}

export interface VerdictBreakdown {
  verdict: string
  count: number
}

export interface AnalyticsSummary {
  topicMastery: TopicMastery[]
  solveVelocity: SolveVelocity[]
  ratingProgression: RatingProgression[]
  platformDistribution: PlatformDistribution[]
  verdictBreakdown: VerdictBreakdown[]
}