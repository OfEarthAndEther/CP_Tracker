import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
})

function parseEnv() {
  const result = envSchema.safeParse(import.meta.env)

  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => issue.path.join('.'))
      .join(', ')
    throw new Error(
      `Missing or invalid Supabase environment variables: ${missing}. ` +
        'Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }

  return result.data
}

export const env = parseEnv()
