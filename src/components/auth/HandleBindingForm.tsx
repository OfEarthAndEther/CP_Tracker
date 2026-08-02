import { useState } from 'react'

import { bindHandle } from '../../auth'
import { useAuth } from '../../auth/hooks/useAuth'
import { useProfile } from '../../auth/hooks/useProfile'

export function HandleBindingForm() {
  const { user } = useAuth()
  const { profile, refreshProfile } = useProfile()
  const [codeforcesHandle, setCodeforcesHandle] = useState(profile?.codeforces_handle ?? '')
  const [leetcodeHandle, setLeetcodeHandle] = useState(profile?.leetcode_handle ?? '')
  const [saving, setSaving] = useState<'codeforces' | 'leetcode' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (!user) {
    return null
  }

  async function saveHandle(platform: 'codeforces' | 'leetcode') {
    if (!user) {
      return
    }

    setSaving(platform)
    setError(null)
    setMessage(null)

    const handle = platform === 'codeforces' ? codeforcesHandle : leetcodeHandle
    const { error: bindError } = await bindHandle({
      userId: user.id,
      platform,
      handle,
    })

    if (bindError) {
      setError(bindError.message)
    } else {
      setMessage(
        platform === 'codeforces'
          ? 'Codeforces handle saved. Complete verification below.'
          : 'LeetCode handle saved. Complete verification below.',
      )
      await refreshProfile()
    }

    setSaving(null)
  }

  return (
    <section className="rounded-xl border border-[var(--border)] p-6">
      <h2 className="text-lg font-semibold text-[var(--text-h)]">Platform handles</h2>
      <p className="mt-2 text-sm text-[var(--text)]">
        Bind your competitive programming handles before verification.
      </p>

      <div className="mt-6 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--text-h)]">Codeforces</span>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={codeforcesHandle}
              onChange={(event) => setCodeforcesHandle(event.target.value)}
              placeholder="e.g. tourist"
              className="min-w-[220px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void saveHandle('codeforces')}
              disabled={saving !== null}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:border-[var(--accent-border)] disabled:opacity-60"
            >
              {saving === 'codeforces' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--text-h)]">LeetCode</span>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={leetcodeHandle}
              onChange={(event) => setLeetcodeHandle(event.target.value)}
              placeholder="e.g. leetcode_username"
              className="min-w-[220px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void saveHandle('leetcode')}
              disabled={saving !== null}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:border-[var(--accent-border)] disabled:opacity-60"
            >
              {saving === 'leetcode' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </label>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-green-700">{message}</p> : null}
    </section>
  )
}
