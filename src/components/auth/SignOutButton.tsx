import { useState } from 'react'

import { signOut } from '../../auth'
import { useAuth } from '../../auth/hooks/useAuth'

type SignOutButtonProps = {
  className?: string
}

export function SignOutButton({ className = '' }: SignOutButtonProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) {
    return null
  }

  async function handleClick() {
    setLoading(true)
    setError(null)

    const { error: signOutError } = await signOut()

    if (signOutError) {
      setError(signOutError.message)
    }

    setLoading(false)
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text)] hover:border-[var(--accent-border)] disabled:opacity-60"
      >
        {loading ? 'Signing out…' : 'Sign out'}
      </button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
