import { useState } from 'react'

import { signInWithGoogle } from '../../auth'

type GoogleSignInButtonProps = {
  className?: string
}

export function GoogleSignInButton({ className = '' }: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)

    const { error: signInError } = await signInWithGoogle()

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2 font-medium text-[var(--text-h)] shadow-sm transition hover:border-[var(--accent-border)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Redirecting…' : 'Continue with Google'}
      </button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
