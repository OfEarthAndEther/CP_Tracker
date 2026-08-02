import { useCallback, useEffect, useState } from 'react'

import {
  CF_POLL_INTERVAL_MS,
  checkVerification,
  getActiveVerification,
  remainingMs,
  startVerification,
} from '../../auth'
import { getCodeforcesVerificationPayload } from '../../auth/verification/codeforces'
import { useAuth } from '../../auth/hooks/useAuth'
import { useProfile } from '../../auth/hooks/useProfile'

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

type CodeforcesVerificationProps = {
  handle: string
}

export function CodeforcesVerification({ handle }: CodeforcesVerificationProps) {
  const { user } = useAuth()
  const { refreshProfile } = useProfile()
  const [token, setToken] = useState<string | null>(null)
  const [snippet, setSnippet] = useState<string | null>(null)
  const [problemUrl, setProblemUrl] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const active = getActiveVerification('codeforces')
    if (active && active.handle === handle) {
      const payload = getCodeforcesVerificationPayload(active.token)
      setToken(active.token)
      setSnippet(payload.snippet)
      setProblemUrl(payload.problemUrl)
      setSummary(payload.summary)
      setStartedAt(active.startedAt)
    }
  }, [handle])

  useEffect(() => {
    if (!startedAt) {
      return
    }

    const tick = () => setCountdown(remainingMs(startedAt))
    tick()

    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [startedAt])

  const runCheck = useCallback(async () => {
    if (!user) {
      return
    }

    setChecking(true)
    setError(null)

    const result = await checkVerification('codeforces', user.id)

    if (result.ok) {
      setSuccess(true)
      await refreshProfile()
    } else {
      setError(result.message ?? 'Verification not complete yet.')
    }

    setChecking(false)
  }, [refreshProfile, user])

  useEffect(() => {
    if (!startedAt || success || !user) {
      return
    }

    const interval = window.setInterval(() => {
      void runCheck()
    }, CF_POLL_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [runCheck, startedAt, success, user])

  function handleStart() {
    if (!user) {
      return
    }

    const payload = startVerification('codeforces', handle, user.id)
    if (payload.platform !== 'codeforces') {
      return
    }

    setToken(payload.token)
    setSnippet(payload.snippet)
    setProblemUrl(payload.problemUrl)
    setSummary(payload.summary)
    setStartedAt(payload.startedAt)
    setSuccess(false)
    setError(null)
  }

  async function copySnippet() {
    if (!snippet) {
      return
    }

    await navigator.clipboard.writeText(snippet)
  }

  if (success) {
    return (
      <p className="text-sm text-green-700">Codeforces handle verified successfully.</p>
    )
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-[var(--text)]">
        Verify ownership of <strong className="text-[var(--text-h)]">{handle}</strong> by
        submitting a compile-error proof.
      </p>

      {!startedAt ? (
        <button
          type="button"
          onClick={handleStart}
          className="w-fit rounded-lg border border-[var(--accent-border)] bg-[var(--accent-bg)] px-4 py-2 text-sm font-medium text-[var(--text-h)]"
        >
          Start Codeforces verification
        </button>
      ) : (
        <>
          {summary ? <p className="text-sm text-[var(--text)]">{summary}</p> : null}
          <p className="text-sm text-[var(--text)]">
            Time remaining:{' '}
            <span className="font-mono text-[var(--text-h)]">
              {formatCountdown(countdown)}
            </span>
          </p>
          {token ? (
            <p className="rounded-lg bg-[var(--code-bg)] px-3 py-2 font-mono text-sm">
              {token}
            </p>
          ) : null}
          {problemUrl ? (
            <a
              href={problemUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[var(--accent)] underline"
            >
              Open verification problem
            </a>
          ) : null}
          {snippet ? (
            <div className="grid gap-2">
              <pre className="overflow-x-auto rounded-lg bg-[var(--code-bg)] p-3 text-xs leading-relaxed">
                {snippet}
              </pre>
              <button
                type="button"
                onClick={() => void copySnippet()}
                className="w-fit rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
              >
                Copy snippet
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void runCheck()}
            disabled={checking || countdown === 0}
            className="w-fit rounded-lg border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-60"
          >
            {checking ? 'Checking…' : 'Check verification now'}
          </button>
        </>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
