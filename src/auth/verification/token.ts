import { VerificationTokenSchema } from '../schemas'

import { VERIFICATION_TOKEN_PREFIX } from './constants'

function randomTokenSuffix(): string {
  const bytes = new Uint8Array(9)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, 'A')
    .replace(/\//g, 'B')
    .replace(/=+$/, '')
    .slice(0, 12)
}

export function createVerificationToken(_userId: string): string {
  const token = `${VERIFICATION_TOKEN_PREFIX}${randomTokenSuffix()}`
  const parsed = VerificationTokenSchema.safeParse(token)

  if (!parsed.success) {
    return createVerificationToken(_userId)
  }

  return parsed.data
}

export function isTokenExpired(startedAt: number, now = Date.now()): boolean {
  return now - startedAt > 5 * 60 * 1000
}

export function remainingMs(startedAt: number, now = Date.now()): number {
  return Math.max(0, 5 * 60 * 1000 - (now - startedAt))
}
