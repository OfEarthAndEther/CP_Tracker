import { LcProfileResponseSchema } from '../schemas'
import type { VerificationResult } from '../types'

import { LC_GRAPHQL_URL, LC_PROFILE_QUERY } from './constants'
import { getLeetCodeInstructions } from './codeforces-instructions'
import { isTokenExpired } from './token'

export async function verifyLeetCodeBio(params: {
  handle: string
  token: string
  startedAt: number
}): Promise<VerificationResult> {
  if (isTokenExpired(params.startedAt)) {
    return { ok: false, reason: 'expired', message: 'Verification window expired.' }
  }

  try {
    const response = await fetch(LC_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: LC_PROFILE_QUERY,
        variables: { username: params.handle },
      }),
    })

    if (!response.ok) {
      return {
        ok: false,
        reason: 'api_error',
        message: `LeetCode API returned ${response.status}.`,
      }
    }

    const json: unknown = await response.json()
    const parsed = LcProfileResponseSchema.safeParse(json)

    if (!parsed.success) {
      return {
        ok: false,
        reason: 'api_error',
        message: 'Unexpected LeetCode API response.',
      }
    }

    if (parsed.data.errors?.length) {
      return {
        ok: false,
        reason: 'api_error',
        message: parsed.data.errors[0]?.message ?? 'LeetCode GraphQL error.',
      }
    }

    const aboutMe = parsed.data.data?.matchedUser?.profile?.aboutMe

    if (aboutMe == null) {
      return {
        ok: false,
        reason: 'handle_not_found',
        message: 'LeetCode profile not found or bio is unavailable.',
      }
    }

    if (!aboutMe.includes(params.token)) {
      return {
        ok: false,
        reason: 'token_mismatch',
        message: 'Token not found in your LeetCode bio yet.',
      }
    }

    return { ok: true }
  } catch {
    return {
      ok: false,
      reason: 'api_error',
      message: 'Could not reach LeetCode API.',
    }
  }
}

export function getLeetCodeVerificationPayload(handle: string, token: string) {
  return getLeetCodeInstructions(token, handle)
}
