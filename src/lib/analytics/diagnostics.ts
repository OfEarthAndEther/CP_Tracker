import type { RedFlag, TopicMastery } from './types'

interface SubmissionLog {
  verdict: string
  problemRating: number
  userBaselineRating: number
  incorrectAttempts: number
  topicTags: string[]
}

/**
 * Pure rule engine to detect red flags, blind spots, and anti-patterns.
 */
export function detectRedFlags(
  submissions: SubmissionLog[],
  topicMasteryList: TopicMastery[],
  userBaselineRating: number
): RedFlag[] {
  const flags: RedFlag[] = []

  // Rule 1: High Penalty Rate (>3 incorrect attempts before solve in any topic)
  const topicPenaltyMap: Record<string, { totalIncorrect: number; solves: number }> = {}
  for (const sub of submissions) {
    if (sub.verdict === 'ACCEPTED') {
      for (const tag of sub.topicTags) {
        if (!topicPenaltyMap[tag]) topicPenaltyMap[tag] = { totalIncorrect: 0, solves: 0 }
        topicPenaltyMap[tag].totalIncorrect += sub.incorrectAttempts
        topicPenaltyMap[tag].solves += 1
      }
    }
  }

  const highPenaltyTopics: string[] = []
  for (const [tag, stat] of Object.entries(topicPenaltyMap)) {
    if (stat.solves > 0 && stat.totalIncorrect / stat.solves >= 3) {
      highPenaltyTopics.push(tag)
    }
  }

  if (highPenaltyTopics.length > 0) {
    flags.push({
      id: 'high-penalty-rate',
      type: 'high_penalty_rate',
      title: 'High Penalty Rate Detected',
      description: `Averaging over 3 wrong attempts before solving problems in: ${highPenaltyTopics.join(', ')}.`,
      severity: 'critical',
      affectedTopics: highPenaltyTopics,
      recommendedAction: 'Focus on dry-running test cases on paper before submitting.',
    })
  }

  // Rule 2: Sudden Decay / Skill Loss (Topic Health < 30%)
  const decayedTopics = topicMasteryList
    .filter((tm) => tm.topicHealth < 30 && tm.solvedCount > 0)
    .map((tm) => tm.topic)

  if (decayedTopics.length > 0) {
    flags.push({
      id: 'sudden-decay',
      type: 'sudden_decay',
      title: 'Decaying Topic Mastery',
      description: `Memory stability has dropped below 30% for: ${decayedTopics.join(', ')}.`,
      severity: 'warning',
      affectedTopics: decayedTopics,
      recommendedAction: 'Complete 1-2 review problems from your Daily Review Queue today.',
    })
  }

  // Rule 3: Comfort Zone Trap (Many easy problems solved well below baseline rating)
  const easySolvesCount = submissions.filter(
    (s) => s.verdict === 'ACCEPTED' && s.problemRating < userBaselineRating - 300
  ).length

  if (easySolvesCount >= 15) {
    flags.push({
      id: 'comfort-zone-trap',
      type: 'comfort_zone_trap',
      title: 'Comfort Zone Trap',
      description: `You have solved ${easySolvesCount} problems far below your baseline rating level (${userBaselineRating}).`,
      severity: 'warning',
      affectedTopics: [],
      recommendedAction: 'Try pushing your boundary with problems rated 100-200 points above your baseline.',
    })
  }

  return flags
}