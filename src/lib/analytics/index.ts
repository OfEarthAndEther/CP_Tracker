export { detectRedFlags } from './diagnostics'
export { aggregateAnalytics } from './aggregators'
export { calculateNextReview } from './spacedRepetition'
export { detectBlindSpots } from './blindSpotDetector'
export type {
  RedFlag,
  RedFlagType,
  Severity,
  TopicMastery,
  SolveVelocity,
  RatingProgression,
  PlatformDistribution,
  VerdictBreakdown,
  AnalyticsSummary,
  SpacedRepetitionInput,
  SpacedRepetitionOutput,
  TopicPerformanceStat,
  BlindSpotTopic,
  TopicMasteryPoint,
  RevisionDeckItem,
  StreakSummary,
  InsightsSnapshot,
} from './types'