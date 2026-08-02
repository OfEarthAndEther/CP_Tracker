import type { z } from 'zod'

import type {
  CfSubmissionSchema,
  CfUserInfoSchema,
  PendingVerificationSchema,
  PlatformSchema,
  ProfileRowSchema,
  VerificationResultSchema,
} from './schemas'

export type Platform = z.infer<typeof PlatformSchema>
export type Profile = z.infer<typeof ProfileRowSchema>
export type PendingVerification = z.infer<typeof PendingVerificationSchema>
export type CfSubmission = z.infer<typeof CfSubmissionSchema>
export type CfUserInfo = z.infer<typeof CfUserInfoSchema>
export type VerificationResult = z.infer<typeof VerificationResultSchema>
