import { markVerified } from '../profile'
import type { Platform, VerificationResult } from '../types'

import {
  getCodeforcesVerificationPayload,
  verifyCodeforcesSubmission,
} from './codeforces'
import {
  getLeetCodeVerificationPayload,
  verifyLeetCodeBio,
} from './leetcode'
import {
  clearPendingVerification,
  getPendingForPlatform,
  savePendingVerification,
} from './pending'
import { createVerificationToken, isTokenExpired } from './token'

export type VerificationStartPayload =
  | {
      platform: 'codeforces'
      handle: string
      token: string
      startedAt: number
      problemUrl: string
      snippet: string
      summary: string
    }
  | {
      platform: 'leetcode'
      handle: string
      token: string
      startedAt: number
      profileUrl: string
      summary: string
    }

export function startVerification(
  platform: Platform,
  handle: string,
  userId: string,
): VerificationStartPayload {
  const token = createVerificationToken(userId)
  const startedAt = Date.now()

  savePendingVerification({ platform, handle, token, startedAt })

  if (platform === 'codeforces') {
    const instructions = getCodeforcesVerificationPayload(token)
    return {
      platform,
      handle,
      token,
      startedAt,
      ...instructions,
    }
  }

  const instructions = getLeetCodeVerificationPayload(handle, token)
  return {
    platform,
    handle,
    token,
    startedAt,
    profileUrl: instructions.profileUrl,
    summary: instructions.summary,
  }
}

export async function checkVerification(
  platform: Platform,
  userId: string,
): Promise<VerificationResult> {
  const pending = getPendingForPlatform(platform)

  if (!pending) {
    return {
      ok: false,
      reason: 'no_pending',
      message: 'No active verification session. Start verification first.',
    }
  }

  if (isTokenExpired(pending.startedAt)) {
    clearPendingVerification(platform)
    return { ok: false, reason: 'expired', message: 'Verification window expired.' }
  }

  const result =
    platform === 'codeforces'
      ? await verifyCodeforcesSubmission({
          handle: pending.handle,
          token: pending.token,
          startedAt: pending.startedAt,
        })
      : await verifyLeetCodeBio({
          handle: pending.handle,
          token: pending.token,
          startedAt: pending.startedAt,
        })

  if (!result.ok) {
    return result
  }

  const { error } = await markVerified({ userId, platform })
  if (error) {
    return { ok: false, reason: 'api_error', message: error.message }
  }

  clearPendingVerification(platform)
  return { ok: true }
}

export function getActiveVerification(platform: Platform) {
  const pending = getPendingForPlatform(platform)
  if (!pending || isTokenExpired(pending.startedAt)) {
    if (pending) {
      clearPendingVerification(platform)
    }
    return null
  }
  return pending
}
