import { PendingVerificationSchema } from '../schemas'
import type { PendingVerification, Platform } from '../types'

import { PENDING_VERIFICATION_STORAGE_KEY } from './constants'

export function savePendingVerification(pending: PendingVerification): void {
  sessionStorage.setItem(PENDING_VERIFICATION_STORAGE_KEY, JSON.stringify(pending))
}

export function loadPendingVerification(): PendingVerification | null {
  const raw = sessionStorage.getItem(PENDING_VERIFICATION_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = PendingVerificationSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function clearPendingVerification(platform?: Platform): void {
  if (!platform) {
    sessionStorage.removeItem(PENDING_VERIFICATION_STORAGE_KEY)
    return
  }

  const pending = loadPendingVerification()
  if (pending?.platform === platform) {
    sessionStorage.removeItem(PENDING_VERIFICATION_STORAGE_KEY)
  }
}

export function getPendingForPlatform(platform: Platform): PendingVerification | null {
  const pending = loadPendingVerification()
  return pending?.platform === platform ? pending : null
}
