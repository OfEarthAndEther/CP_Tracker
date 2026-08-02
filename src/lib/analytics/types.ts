export type Severity = 'critical' | 'warning' | 'info'
export type RedFlagType =
  | 'high_penalty_rate'
  | 'sudden_decay'
  | 'comfort_zone_trap'
  | 'avoidance_pattern'
  | 'topic_blind_spot'
  | 'opportunity_gap'

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

export interface SpacedRepetitionInput {
  confidence: number
  repetitions: number
  previousEaseFactor: number
  previousInterval: number
}

export interface SpacedRepetitionOutput {
  reviewDate: string
  easeFactor: number
  intervalDays: number
}

export interface TopicPerformanceStat {
  topic: string
  attempts: number
  solvedCount: number
  successRate: number
  averageSolveTimeMinutes: number | null
  lastAttemptAt: string | null
  lastAcceptedAt: string | null
  globalFrequency: number
}

export interface BlindSpotTopic {
  topic: string
  category: 'red_flag' | 'opportunity_gap'
  title: string
  description: string
  severity: Severity
  attempts: number
  successRate: number
  averageSolveTimeMinutes: number | null
  lastAttemptAt: string | null
  daysSinceLastAttempt: number | null
  globalFrequency: number
  recommendedAction: string
}

export interface TopicMasteryPoint {
  topic: string
  masteryScore: number
  accuracyRate: number
  averageSolveTimeMinutes: number | null
  solvedCount: number
  attempts: number
}

export interface RevisionDeckItem {
  id: string
  problemId: string
  title: string
  url: string
  platform: 'codeforces' | 'leetcode'
  taxonomyTags: string[]
  reviewDate: string
  dueDate: string
  repetitions: number
  intervalDays: number
  easeFactor: number
  daysOverdue: number
}

export interface StreakSummary {
  currentStreak: number
  longestStreak: number
  lastSolvedAt: string | null
  activeToday: boolean
}

export interface InsightsSnapshot {
  generatedAt: string
  revisionQueue: RevisionDeckItem[]
  blindSpots: {
    topicStats: TopicPerformanceStat[]
    redFlags: RedFlag[]
    opportunityGaps: BlindSpotTopic[]
  }
  masteryDistribution: TopicMasteryPoint[]
  streak: StreakSummary
}