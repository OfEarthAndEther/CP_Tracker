import { supabase } from '../lib/supabase'

export async function resolveOAuthCallback(): Promise<{
  error: Error | null
}> {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const queryParams = new URLSearchParams(window.location.search)

  const hasAuthParams =
    hashParams.has('access_token') ||
    hashParams.has('error') ||
    queryParams.has('code') ||
    queryParams.has('error')

  if (!hasAuthParams) {
    const { error } = await supabase.auth.getSession()
    return { error: error ? new Error(error.message) : null }
  }

  const oauthError =
    hashParams.get('error_description') ??
    hashParams.get('error') ??
    queryParams.get('error_description') ??
    queryParams.get('error')

  if (oauthError) {
    return { error: new Error(oauthError) }
  }

  const { error } = await supabase.auth.getSession()
  return { error: error ? new Error(error.message) : null }
}
