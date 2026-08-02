import { z } from 'zod'

export const PlatformSchema = z.enum(['codeforces', 'leetcode'])
export type Platform = z.infer<typeof PlatformSchema>

export const ProfileRowSchema = z.object({
  id: z.uuid(),
  updated_at: z.string(),
  codeforces_handle: z.string().nullable(),
  leetcode_handle: z.string().nullable(),
  cf_verified: z.boolean(),
  lc_verified: z.boolean(),
})

export const VerificationTokenSchema = z.string().regex(/^CPTRACK-[A-Za-z0-9]{12}$/)

export const PendingVerificationSchema = z.object({
  platform: PlatformSchema,
  handle: z.string().min(1),
  token: VerificationTokenSchema,
  startedAt: z.number().int().positive(),
})

export const CfApiStatusSchema = z.enum(['OK', 'FAILED'])

export const CfProblemSchema = z.object({
  contestId: z.number().int().optional(),
  index: z.string(),
  name: z.string().optional(),
})

export const CfSubmissionSchema = z
  .object({
    id: z.number().int(),
    creationTimeSeconds: z.number().int(),
    verdict: z.string().nullable().optional(),
    programmingLanguage: z.string().optional(),
    problem: CfProblemSchema,
    compilerOutput: z.string().optional(),
    source: z.string().optional(),
  })
  .passthrough()

export const CfUserStatusResponseSchema = z.object({
  status: CfApiStatusSchema,
  comment: z.string().optional(),
  result: z.array(CfSubmissionSchema).optional(),
})

export const CfUserInfoSchema = z.object({
  handle: z.string(),
})

export const CfUserInfoResponseSchema = z.object({
  status: CfApiStatusSchema,
  comment: z.string().optional(),
  result: z.array(CfUserInfoSchema).optional(),
})

export const LcProfileResponseSchema = z.object({
  data: z
    .object({
      matchedUser: z
        .object({
          profile: z
            .object({
              aboutMe: z.string().nullable().optional(),
            })
            .nullable()
            .optional(),
        })
        .nullable()
        .optional(),
    })
    .optional(),
  errors: z
    .array(
      z.object({
        message: z.string(),
      }),
    )
    .optional(),
})

export const VerificationResultSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
  }),
  z.object({
    ok: z.literal(false),
    reason: z.enum([
      'expired',
      'not_found',
      'handle_not_found',
      'api_error',
      'no_pending',
      'token_mismatch',
    ]),
    message: z.string().optional(),
  }),
])
