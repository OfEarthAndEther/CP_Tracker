import { useEffect, useMemo, useState } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'

import { supabase } from '../../lib/supabase'
import type { InsightsSnapshot, TopicMasteryPoint } from '../../lib/analytics'

type InsightsSummaryProps = {
  endpoint?: string
  snapshot?: InsightsSnapshot
}

function formatPercentage(value: number): string {
  return `${Math.round(value)}%`
}

function formatMinutes(value: number | null): string {
  if (value === null) {
    return 'n/a'
  }

  if (value < 60) {
    return `${value.toFixed(0)}m`
  }

  const hours = Math.floor(value / 60)
  const minutes = Math.round(value % 60)
  return `${hours}h ${minutes}m`
}

function statTone(score: number): string {
  if (score >= 75) {
    return 'from-emerald-500/15 to-lime-500/5 text-emerald-700'
  }

  if (score >= 50) {
    return 'from-amber-500/15 to-yellow-500/5 text-amber-700'
  }

  return 'from-rose-500/15 to-orange-500/5 text-rose-700'
}

function topicLabel(topic: string): string {
  return topic.length > 24 ? `${topic.slice(0, 24)}…` : topic
}

export function InsightsSummary({ endpoint = '/api/analytics/insights', snapshot }: InsightsSummaryProps) {
  const [remoteSnapshot, setRemoteSnapshot] = useState<InsightsSnapshot | null>(snapshot ?? null)
  const [loading, setLoading] = useState(!snapshot)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (snapshot) {
      return
    }

    let active = true

    async function loadInsights() {
      setLoading(true)
      setError(null)

      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token

      if (!accessToken) {
        if (active) {
          setLoading(false)
        }
        return
      }

      try {
        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Insights request failed with status ${response.status}.`)
        }

        const payload = (await response.json()) as InsightsSnapshot

        if (active) {
          setRemoteSnapshot(payload)
        }
      } catch (fetchError) {
        if (active) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load insights.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadInsights()

    return () => {
      active = false
    }
  }, [endpoint, snapshot])

  const data = snapshot ?? remoteSnapshot
  const radarData = useMemo<TopicMasteryPoint[]>(() => {
    const mastery = data?.masteryDistribution ?? []

    return [...mastery].sort((left, right) => right.masteryScore - left.masteryScore).slice(0, 6)
  }, [data])

  const dueCount = data?.revisionQueue.length ?? 0
  const topRedFlags = data?.blindSpots.redFlags.slice(0, 3) ?? []
  const topGaps = data?.blindSpots.opportunityGaps.slice(0, 3) ?? []

  if (loading) {
    return (
      <section className="rounded-3xl border border-white/10 bg-slate-950/90 p-6 text-slate-100 shadow-2xl shadow-slate-950/20 backdrop-blur">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded-full bg-white/10" />
          <div className="h-28 rounded-2xl bg-white/5" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-40 rounded-2xl bg-white/5" />
            <div className="h-40 rounded-2xl bg-white/5" />
          </div>
        </div>
      </section>
    )
  }

  if (error && !data) {
    return (
      <section className="rounded-3xl border border-rose-500/20 bg-rose-950/60 p-6 text-rose-50 shadow-xl shadow-rose-950/10">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-rose-200/80">Insights unavailable</p>
        <h2 className="mt-3 text-2xl font-semibold">Unable to load analytics</h2>
        <p className="mt-2 text-sm text-rose-100/80">{error}</p>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="rounded-3xl border border-white/10 bg-slate-950/90 p-6 text-slate-100 shadow-2xl shadow-slate-950/20 backdrop-blur">
        <p className="text-sm text-slate-300">Sign in to load analytics insights.</p>
      </section>
    )
  }

  return (
    <section className="space-y-6 rounded-[2rem] border border-slate-800/70 bg-slate-950/95 p-6 text-slate-100 shadow-2xl shadow-slate-950/30 backdrop-blur">
      <div className="rounded-[1.75rem] border border-cyan-400/20 bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 p-6 text-white shadow-lg shadow-cyan-950/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-cyan-200/80">
              Revision queue
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              {dueCount} problems due for revision today
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-200/80">
              Stage 5 combines SM-2 scheduling, blind-spot detection, and topic mastery so you can
              prioritize recall work before it decays.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm md:min-w-72">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-slate-300">Current streak</p>
              <p className="mt-1 text-2xl font-semibold">{data.streak.currentStreak} days</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-slate-300">Longest streak</p>
              <p className="mt-1 text-2xl font-semibold">{data.streak.longestStreak} days</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[1.75rem] border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                Blind-spot warnings
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">Red flags and opportunity gaps</h3>
            </div>
            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200">
              {topRedFlags.length + topGaps.length} flagged topics
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {topRedFlags.map((flag) => (
              <div
                key={flag.id}
                className="rounded-2xl border border-rose-500/15 bg-gradient-to-br from-rose-500/10 to-slate-900 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-rose-200">{flag.title}</p>
                    <p className="mt-1 text-sm text-slate-300">{flag.description}</p>
                  </div>
                  <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-rose-200">
                    {flag.severity}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Action: {flag.recommendedAction}
                </p>
              </div>
            ))}

            {topGaps.map((gap) => (
              <div
                key={`${gap.topic}-${gap.category}`}
                className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-cyan-500/10 to-slate-900 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-cyan-100">{gap.title}</p>
                    <p className="mt-1 text-sm text-slate-300">{gap.description}</p>
                  </div>
                  <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100">
                    gap
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Last attempt: {gap.daysSinceLastAttempt === null ? 'never' : `${gap.daysSinceLastAttempt} days ago`}
                </p>
              </div>
            ))}

            {topRedFlags.length === 0 && topGaps.length === 0 ? (
              <p className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
                No blind spots detected yet. Keep solving and the detector will surface gaps as the
                history grows.
              </p>
            ) : null}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
              Topic mastery
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">Radar and progress cards</h3>
          </div>

          <div className="mt-6 h-[320px] rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="rgba(148,163,184,0.18)" />
                  <PolarAngleAxis
                    dataKey="topic"
                    tick={{ fill: '#cbd5e1', fontSize: 12 }}
                    tickFormatter={topicLabel}
                  />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Mastery"
                    dataKey="masteryScore"
                    stroke="#22d3ee"
                    fill="#06b6d4"
                    fillOpacity={0.25}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No mastery data yet.
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {data.masteryDistribution.slice(0, 4).map((topic) => (
              <div
                key={topic.topic}
                className={`rounded-2xl border border-white/10 bg-gradient-to-br p-4 ${statTone(topic.masteryScore)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{topic.topic}</p>
                    <p className="mt-1 text-xs text-white/70">
                      {topic.attempts} attempts · {topic.solvedCount} solves
                    </p>
                  </div>
                  <span className="rounded-full bg-black/10 px-2.5 py-1 text-xs font-semibold text-white">
                    {formatPercentage(topic.masteryScore)}
                  </span>
                </div>

                <div className="mt-4 h-2 rounded-full bg-black/10">
                  <div
                    className="h-2 rounded-full bg-white/80"
                    style={{ width: `${Math.max(4, Math.min(100, topic.masteryScore))}%` }}
                  />
                </div>

                <p className="mt-3 text-xs text-white/70">
                  Accuracy {formatPercentage(topic.accuracyRate)} · Avg solve {formatMinutes(topic.averageSolveTimeMinutes)}
                </p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Revision deck</p>
          <p className="mt-3 text-3xl font-semibold text-white">{data.revisionQueue.length}</p>
          <p className="mt-2 text-sm text-slate-300">Items scheduled or overdue for today.</p>
        </div>

        <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Red flags</p>
          <p className="mt-3 text-3xl font-semibold text-white">{data.blindSpots.redFlags.length}</p>
          <p className="mt-2 text-sm text-slate-300">Topics below the 50% success or 45 minute threshold.</p>
        </div>

        <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Current streak</p>
          <p className="mt-3 text-3xl font-semibold text-white">{data.streak.currentStreak} days</p>
          <p className="mt-2 text-sm text-slate-300">
            Last solved {data.streak.lastSolvedAt ? getReadableDate(data.streak.lastSolvedAt) : 'n/a'}
          </p>
        </div>
      </div>
    </section>
  )
}

function getReadableDate(isoValue: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(isoValue))
}