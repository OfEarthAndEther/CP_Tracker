type VerificationStatusBadgeProps = {
  verified: boolean
  pending?: boolean
  label: string
}

export function VerificationStatusBadge({
  verified,
  pending = false,
  label,
}: VerificationStatusBadgeProps) {
  const status = verified ? 'verified' : pending ? 'pending' : 'unverified'

  const styles: Record<typeof status, string> = {
    verified: 'border-green-300 bg-green-50 text-green-800',
    pending: 'border-amber-300 bg-amber-50 text-amber-800',
    unverified: 'border-[var(--border)] bg-[var(--code-bg)] text-[var(--text)]',
  }

  const text: Record<typeof status, string> = {
    verified: 'Verified',
    pending: 'Pending',
    unverified: 'Unverified',
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      <span>{label}</span>
      <span aria-hidden="true">·</span>
      <span>{text[status]}</span>
    </span>
  )
}
