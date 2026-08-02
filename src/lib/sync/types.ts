import type { Platform } from '../../auth/schemas'

export interface NormalizedProblem {
  id: string // 'CF-1234A' or 'LC-72'
  platform: Platform
  external_id: string
  title: string
  url: string
  normalized_rating: number // 800-3500
  taxonomy_tags: string[]
}

export interface NormalizedSubmission {
  user_id: string
  problem_id: string
  submitted_at: string // ISO Timestamp
  verdict: 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'MEMORY_LIMIT_EXCEEDED' | 'RUNTIME_ERROR' | 'COMPILATION_ERROR' | 'OTHER'
  execution_time_ms?: number
  memory_bytes?: number
  raw_payload: unknown
}

export interface SyncResult {
  platform: Platform
  success: boolean
  submissionsSynced: number
  problemsAdded: number
  error?: string
}

export interface SyncOptions {
  forceFullSync?: boolean
  limit?: number
}
