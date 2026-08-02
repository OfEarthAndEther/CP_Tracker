import { getActiveVerification } from '../../auth'
import { useProfile } from '../../auth/hooks/useProfile'

import { CodeforcesVerification } from './CodeforcesVerification'
import { LeetCodeVerification } from './LeetCodeVerification'
import { VerificationStatusBadge } from './VerificationStatusBadge'

export function VerificationPanel() {
  const { profile } = useProfile()

  if (!profile) {
    return null
  }

  const cfPending = Boolean(
    profile.codeforces_handle &&
      !profile.cf_verified &&
      getActiveVerification('codeforces')?.handle === profile.codeforces_handle,
  )

  const lcPending = Boolean(
    profile.leetcode_handle &&
      !profile.lc_verified &&
      getActiveVerification('leetcode')?.handle === profile.leetcode_handle,
  )

  return (
    <section className="rounded-xl border border-[var(--border)] p-6">
      <h2 className="text-lg font-semibold text-[var(--text-h)]">Handle verification</h2>
      <p className="mt-2 text-sm text-[var(--text)]">
        Prove ownership before syncing submissions from each platform.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <VerificationStatusBadge
          label="Codeforces"
          verified={profile.cf_verified}
          pending={cfPending}
        />
        <VerificationStatusBadge
          label="LeetCode"
          verified={profile.lc_verified}
          pending={lcPending}
        />
      </div>

      <div className="mt-8 grid gap-8">
        {profile.codeforces_handle && !profile.cf_verified ? (
          <div>
            <h3 className="text-base font-medium text-[var(--text-h)]">Codeforces</h3>
            <div className="mt-3">
              <CodeforcesVerification handle={profile.codeforces_handle} />
            </div>
          </div>
        ) : null}

        {profile.leetcode_handle && !profile.lc_verified ? (
          <div>
            <h3 className="text-base font-medium text-[var(--text-h)]">LeetCode</h3>
            <div className="mt-3">
              <LeetCodeVerification handle={profile.leetcode_handle} />
            </div>
          </div>
        ) : null}

        {profile.cf_verified && profile.lc_verified ? (
          <p className="text-sm text-green-700">All bound handles are verified.</p>
        ) : null}

        {!profile.codeforces_handle && !profile.leetcode_handle ? (
          <p className="text-sm text-[var(--text)]">
            Save a platform handle above to begin verification.
          </p>
        ) : null}
      </div>
    </section>
  )
}
