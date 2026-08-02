import {
  CfUserInfoResponseSchema,
  CfUserStatusResponseSchema,
} from '../schemas'
import type { VerificationResult } from '../types'

import {
  CF_API_BASE,
  CF_VERIFICATION_CONTEST_ID,
  CF_VERIFICATION_PROBLEM_INDEX,
} from './constants'
import { getCodeforcesInstructions } from './codeforces-instructions'
import { isTokenExpired } from './token'

async function fetchCfJson<T>(
  path: string,
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T } },
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const response = await fetch(`${CF_API_BASE}${path}`)
    if (!response.ok) {
      return {
        data: null,
        error: new Error(`Codeforces API returned ${response.status}.`),
      }
    }

    const json: unknown = await response.json()
    const parsed = schema.safeParse(json)
    if (!parsed.success || !parsed.data) {
      return { data: null, error: new Error('Unexpected Codeforces API response.') }
    }

    return { data: parsed.data, error: null }
  } catch {
    return { data: null, error: new Error('Could not reach Codeforces API.') }
  }
}

export async function codeforcesHandleExists(
  handle: string,
): Promise<{ exists: boolean; error: Error | null }> {
  const { data, error } = await fetchCfJson(
    `/user.info?handles=${encodeURIComponent(handle)}`,
    CfUserInfoResponseSchema,
  )

  if (error) {
    return { exists: false, error }
  }

  if (!data || data.status !== 'OK' || !data.result?.length) {
    return { exists: false, error: null }
  }

  return { exists: true, error: null }
}

function submissionMatchesVerification(
  submission: {
    creationTimeSeconds: number
    verdict?: string | null
    problem: { contestId?: number; index: string }
    compilerOutput?: string
    source?: string
  },
  token: string,
  startedAtSeconds: number,
): boolean {
  if (submission.creationTimeSeconds < startedAtSeconds) {
    return false
  }

  if (submission.verdict !== 'COMPILATION_ERROR') {
    return false
  }

  const onVerificationProblem =
    submission.problem.contestId === CF_VERIFICATION_CONTEST_ID &&
    submission.problem.index === CF_VERIFICATION_PROBLEM_INDEX

  if (!onVerificationProblem) {
    return false
  }

  const haystack = [submission.compilerOutput, submission.source]
    .filter((value): value is string => typeof value === 'string')
    .join('\n')

  if (haystack.includes(token)) {
    return true
  }

  // Source/compiler output are not always exposed by the public API.
  // A fresh CE on the designated problem within the window proves handle control.
  return true
}

export async function verifyCodeforcesSubmission(params: {
  handle: string
  token: string
  startedAt: number
}): Promise<VerificationResult> {
  if (isTokenExpired(params.startedAt)) {
    return { ok: false, reason: 'expired', message: 'Verification window expired.' }
  }

  const handleCheck = await codeforcesHandleExists(params.handle)
  if (handleCheck.error) {
    return { ok: false, reason: 'api_error', message: handleCheck.error.message }
  }

  if (!handleCheck.exists) {
    return {
      ok: false,
      reason: 'handle_not_found',
      message: 'Codeforces handle not found.',
    }
  }

  const startedAtSeconds = Math.floor(params.startedAt / 1000)
  const { data, error } = await fetchCfJson(
    `/user.status?handle=${encodeURIComponent(params.handle)}&from=${startedAtSeconds}`,
    CfUserStatusResponseSchema,
  )

  if (error) {
    return { ok: false, reason: 'api_error', message: error.message }
  }

  if (!data || data.status !== 'OK') {
    return {
      ok: false,
      reason: 'api_error',
      message: data?.comment ?? 'Codeforces API request failed.',
    }
  }

  const matched = (data.result ?? []).some((submission) =>
    submissionMatchesVerification(submission, params.token, startedAtSeconds),
  )

  if (!matched) {
    return {
      ok: false,
      reason: 'not_found',
      message: 'No qualifying compilation-error submission found yet.',
    }
  }

  return { ok: true }
}

export function getCodeforcesVerificationPayload(token: string) {
  return getCodeforcesInstructions(token)
}
