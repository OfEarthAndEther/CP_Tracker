import type { ReactNode } from 'react'

import { useAuth } from '../../auth/hooks/useAuth'

type AuthGateProps = {
  children: ReactNode
  fallback?: ReactNode
  loadingFallback?: ReactNode
}

export function AuthGate({
  children,
  fallback,
  loadingFallback,
}: AuthGateProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <>
        {loadingFallback ?? (
          <p className="text-sm text-[var(--text)]">Checking session…</p>
        )}
      </>
    )
  }

  if (!user) {
    return (
      <>
        {fallback ?? (
          <div className="rounded-xl border border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold text-[var(--text-h)]">Sign in required</h2>
            <p className="mt-2 text-sm text-[var(--text)]">
              Connect your Google account to bind platform handles.
            </p>
          </div>
        )}
      </>
    )
  }

  return <>{children}</>
}
