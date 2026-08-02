import type { Session, User } from '@supabase/supabase-js'

import { supabase } from '../lib/supabase'

const AUTH_CALLBACK_PATH = '/auth/callback'

function getRedirectUrl(): string {
  return `${window.location.origin}${AUTH_CALLBACK_PATH}`
}

export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getRedirectUrl(),
    },
  })

  return { error: error ? new Error(error.message) : null }
}

export async function signOut(): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signOut()
  return { error: error ? new Error(error.message) : null }
}

export async function getSession(): Promise<{
  session: Session | null
  user: User | null
  error: Error | null
}> {
  const { data, error } = await supabase.auth.getSession()

  return {
    session: data.session,
    user: data.session?.user ?? null,
    error: error ? new Error(error.message) : null,
  }
}
