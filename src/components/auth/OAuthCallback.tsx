import { useEffect, useState } from 'react'

import { resolveOAuthCallback } from '../../auth'

type OAuthCallbackProps = {
  onComplete?: () => void
}

export function OAuthCallback({ onComplete }: OAuthCallbackProps) {
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let mounted = true

    async function run() {
      const { error: callbackError } = await resolveOAuthCallback()

      if (!mounted) {
        return
      }

      if (callbackError) {
        setError(callbackError.message)
      } else {
        setDone(true)
        onComplete?.()
      }
    }

    void run()

    return () => {
      mounted = false
    }
  }, [onComplete])

  if (error) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-red-800">
        <h2 className="text-lg font-semibold">Sign-in failed</h2>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text-h)]">Signed in</h2>
        <p className="mt-2 text-sm text-[var(--text)]">
          You can close this page or continue to handle binding.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-6">
      <p className="text-sm text-[var(--text)]">Completing Google sign-in…</p>
    </div>
  )
}
