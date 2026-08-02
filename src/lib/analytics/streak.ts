import type { StreakSummary } from './types'

interface StreakSubmissionRecord {
  submitted_at: string
  verdict: string
}

function getUtcDayKey(isoValue: string): string {
  return isoValue.slice(0, 10)
}

function getUtcDayStartKey(referenceDate: Date): string {
  return referenceDate.toISOString().slice(0, 10)
}

export function getDaysBetween(endIsoValue: string, startIsoValue: string): number {
  const endDate = new Date(endIsoValue)
  const startDate = new Date(startIsoValue)

  return Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000)
}

export function buildStreakSummary(submissions: StreakSubmissionRecord[], referenceDate = new Date()): StreakSummary {
  const solvedDates = new Set(
    submissions
      .filter((submission) => submission.verdict === 'ACCEPTED')
      .map((submission) => getUtcDayKey(submission.submitted_at)),
  )

  const solvedDateList = [...solvedDates].sort((left, right) => right.localeCompare(left))
  const lastSolvedAt = solvedDateList[0] ? `${solvedDateList[0]}T00:00:00.000Z` : null

  let currentStreak = 0
  if (lastSolvedAt) {
    const cursor = new Date(lastSolvedAt)

    while (solvedDates.has(getUtcDayKey(cursor.toISOString()))) {
      currentStreak += 1
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    }
  }

  let longestStreak = 0
  let activeRun = 0
  let previousDate: string | null = null

  for (const dateKey of [...solvedDates].sort()) {
    if (!previousDate) {
      activeRun = 1
    } else {
      const previous = new Date(`${previousDate}T00:00:00.000Z`)
      previous.setUTCDate(previous.getUTCDate() + 1)
      activeRun = previous.toISOString().slice(0, 10) === dateKey ? activeRun + 1 : 1
    }

    longestStreak = Math.max(longestStreak, activeRun)
    previousDate = dateKey
  }

  const todayKey = getUtcDayStartKey(referenceDate)

  return {
    currentStreak,
    longestStreak,
    lastSolvedAt,
    activeToday: solvedDates.has(todayKey),
  }
}
