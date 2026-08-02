import { describe, expect, it } from 'vitest'

import { buildStreakSummary, calculateNextReview, detectBlindSpots } from '../index'

describe('calculateNextReview', () => {
  it('resets the interval to 1 day when confidence is below 3', () => {
    const result = calculateNextReview({
      confidence: 2,
      repetitions: 4,
      previousEaseFactor: 2.5,
      previousInterval: 12,
    })

    expect(result.intervalDays).toBe(1)
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3)
  })

  it('sets the initial repetition to 1 day and repetition 1 to 6 days', () => {
    const firstReview = calculateNextReview({
      confidence: 4,
      repetitions: 0,
      previousEaseFactor: 2.5,
      previousInterval: 0,
    })

    const secondReview = calculateNextReview({
      confidence: 4,
      repetitions: 1,
      previousEaseFactor: 2.5,
      previousInterval: 1,
    })

    expect(firstReview.intervalDays).toBe(1)
    expect(secondReview.intervalDays).toBe(6)
  })

  it('never lets the ease factor drop below 1.3', () => {
    const result = calculateNextReview({
      confidence: 1,
      repetitions: 5,
      previousEaseFactor: 1.31,
      previousInterval: 20,
    })

    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3)
  })
})

describe('detectBlindSpots', () => {
  const problems = [
    {
      id: 'p1',
      title: 'DP basics',
      taxonomy_tags: ['Dynamic Programming'],
      platform: 'leetcode' as const,
      normalized_rating: 1600,
    },
    {
      id: 'p2',
      title: 'Tree path',
      taxonomy_tags: ['Trees'],
      platform: 'leetcode' as const,
      normalized_rating: 1200,
    },
    {
      id: 'p3',
      title: 'Bit mask',
      taxonomy_tags: ['Bit Manipulation'],
      platform: 'codeforces' as const,
      normalized_rating: 1800,
    },
  ]

  it('creates a red flag when a topic falls below 50% success', () => {
    const submissions = [
      {
        id: 's1',
        problem_id: 'p1',
        submitted_at: '2026-07-30T10:00:00.000Z',
        verdict: 'WRONG_ANSWER',
        problems: problems[0],
      },
      {
        id: 's2',
        problem_id: 'p1',
        submitted_at: '2026-07-30T10:20:00.000Z',
        verdict: 'WRONG_ANSWER',
        problems: problems[0],
      },
      {
        id: 's3',
        problem_id: 'p1',
        submitted_at: '2026-07-30T10:40:00.000Z',
        verdict: 'ACCEPTED',
        problems: problems[0],
      },
    ]

    const result = detectBlindSpots(submissions, problems)

    expect(result.redFlags.length).toBeGreaterThan(0)
    expect(result.redFlags[0]?.severity).toMatch(/critical|warning/)
    expect(result.redFlags[0]?.affectedTopics).toContain('Dynamic Programming')
  })

  it('creates an opportunity gap when a common topic has not been attempted for over 21 days', () => {
    const recentProblems = [
      ...problems,
      {
        id: 'p4',
        title: 'More trees',
        taxonomy_tags: ['Trees'],
        platform: 'codeforces' as const,
        normalized_rating: 1500,
      },
      {
        id: 'p5',
        title: 'More trees 2',
        taxonomy_tags: ['Trees'],
        platform: 'leetcode' as const,
        normalized_rating: 1500,
      },
      {
        id: 'p6',
        title: 'More trees 3',
        taxonomy_tags: ['Trees'],
        platform: 'leetcode' as const,
        normalized_rating: 1500,
      },
      {
        id: 'p7',
        title: 'More trees 4',
        taxonomy_tags: ['Trees'],
        platform: 'leetcode' as const,
        normalized_rating: 1500,
      },
      {
        id: 'p8',
        title: 'More trees 5',
        taxonomy_tags: ['Trees'],
        platform: 'leetcode' as const,
        normalized_rating: 1500,
      },
    ]

    const submissions = [
      {
        id: 's10',
        problem_id: 'p2',
        submitted_at: '2026-07-01T10:00:00.000Z',
        verdict: 'ACCEPTED',
        problems: problems[1],
      },
      {
        id: 's11',
        problem_id: 'p2',
        submitted_at: '2026-07-01T10:30:00.000Z',
        verdict: 'WRONG_ANSWER',
        problems: problems[1],
      },
    ]

    const result = detectBlindSpots(submissions, recentProblems)

    expect(result.opportunityGaps.some((gap) => gap.category === 'opportunity_gap')).toBe(true)
    expect(result.opportunityGaps.some((gap) => gap.topic === 'Trees')).toBe(true)
  })
})

describe('buildStreakSummary', () => {
  it('returns the correct current and longest streak for consecutive accepted submissions', () => {
    const submissions = [
      { submitted_at: '2026-07-28T09:00:00.000Z', verdict: 'ACCEPTED' },
      { submitted_at: '2026-07-29T09:00:00.000Z', verdict: 'ACCEPTED' },
      { submitted_at: '2026-07-30T09:00:00.000Z', verdict: 'ACCEPTED' },
      { submitted_at: '2026-07-30T12:00:00.000Z', verdict: 'WRONG_ANSWER' },
    ]

    const result = buildStreakSummary(submissions, new Date('2026-07-30T18:00:00.000Z'))

    expect(result.currentStreak).toBe(3)
    expect(result.longestStreak).toBe(3)
    expect(result.activeToday).toBe(true)
  })
})
