export { AuthProvider } from './context/AuthProvider'
export { resolveOAuthCallback } from './callback'
export { useAuth } from './hooks/useAuth'
export { useProfile } from './hooks/useProfile'
export { bindHandle, fetchProfile, markVerified } from './profile'
export { getSession, signInWithGoogle, signOut } from './oauth'
export {
  checkVerification,
  getActiveVerification,
  startVerification,
  type VerificationStartPayload,
} from './verification/orchestrator'
export { CF_POLL_INTERVAL_MS, VERIFICATION_WINDOW_MS } from './verification/constants'
export { remainingMs } from './verification/token'
export type { Platform, Profile, VerificationResult } from './types'
