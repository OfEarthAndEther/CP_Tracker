import { useEffect, useState } from 'react'

import { checkVerification, getActiveVerification, remainingMs, startVerification } from '../../auth'
import { useAuth } from '../../auth/hooks/useAuth'
import { useProfile } from '../../auth/hooks/useProfile'

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

type LeetCodeVerificationProps = {
  handle: string
}

export function LeetCodeVerification({ handle }: LeetCodeVerificationProps) {
  const { user } = useAuth()
  const { refreshProfile } = useProfile()
  const [token, setToken] = useState<string | null>(null)
  const [profileUrl, setProfileUrl] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const active = getActiveVerification('leetcode')
    if (active && active.handle === handle) {
      setToken(active.token)
      setProfileUrl(`https://leetcode.com/${handle}/`)
      setSummary('Add the token below to your LeetCode bio (About Me), save, then click Verify.')
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

  function handleStart() {
    if (!user) {
      return
    }

    const payload = startVerification('leetcode', handle, user.id)
    if (payload.platform !== 'leetcode') {
      return
    }

    setToken(payload.token)
    setProfileUrl(payload.profileUrl)
    setSummary(payload.summary)
    setStartedAt(payload.startedAt)
    setSuccess(false)
    setError(null)
  }

  async function handleVerify() {
    if (!user) {
      return
    }

    setChecking(true)
    setError(null)

    const result = await checkVerification('leetcode', user.id)

    if (result.ok) {
      setSuccess(true)
      await refreshProfile()
    } else {
      setError(result.message ?? 'Verification not complete yet.')
    }

    setChecking(false)
  }

  async function copyToken() {
    if (!token) {
      return
    }

    await navigator.clipboard.writeText(token)
  }

  if (success) {
    return <p className="text-sm text-green-700">LeetCode handle verified successfully.</p>
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-[var(--text)]">
        Verify ownership of <strong className="text-[var(--text-h)]">{handle}</strong> via
        bio-string match.
      </p>

      {!startedAt ? (
        <button
          type="button"
          onClick={handleStart}
          className="w-fit rounded-lg border border-[var(--accent-border)] bg-[var(--accent-bg)] px-4 py-2 text-sm font-medium text-[var(--text-h)]"
        >
          Start LeetCode verification
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
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-[var(--code-bg)] px-3 py-2 text-sm">{token}</code>
              <button
                type="button"
                onClick={() => void copyToken()}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
              >
                Copy token
              </button>
            </div>
          ) : null}
          {profileUrl ? (
            <a
              href={profileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[var(--accent)] underline"
            >
              Open LeetCode profile settings
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => void handleVerify()}
            disabled={checking || countdown === 0}
            className="w-fit rounded-lg border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-60"
          >
            {checking ? 'Checking…' : 'Verify bio'}
          </button>
        </>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
