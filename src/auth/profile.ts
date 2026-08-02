import { supabase } from '../lib/supabase'

import { ProfileRowSchema } from './schemas'
import type { Platform, Profile } from './types'

function profileColumn(platform: Platform): 'codeforces_handle' | 'leetcode_handle' {
  return platform === 'codeforces' ? 'codeforces_handle' : 'leetcode_handle'
}

function verifiedColumn(platform: Platform): 'cf_verified' | 'lc_verified' {
  return platform === 'codeforces' ? 'cf_verified' : 'lc_verified'
}

function mapProfileError(error: { code?: string; message: string }): Error {
  if (error.code === '23505') {
    return new Error('That handle is already linked to another account.')
  }

  return new Error(error.message)
}

export async function fetchProfile(userId: string): Promise<{
  profile: Profile | null
  error: Error | null
}> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    return { profile: null, error: new Error(error.message) }
  }

  if (!data) {
    return { profile: null, error: null }
  }

  const parsed = ProfileRowSchema.safeParse(data)
  if (!parsed.success) {
    return { profile: null, error: new Error('Invalid profile data from server.') }
  }

  return { profile: parsed.data, error: null }
}

export async function bindHandle(params: {
  userId: string
  platform: Platform
  handle: string
}): Promise<{ profile: Profile | null; error: Error | null }> {
  const normalizedHandle = params.handle.trim()
  if (!normalizedHandle) {
    return { profile: null, error: new Error('Handle cannot be empty.') }
  }

  const handleColumn = profileColumn(params.platform)
  const verifiedFlag = verifiedColumn(params.platform)

  const { data, error } = await supabase
    .from('profiles')
    .update({
      [handleColumn]: normalizedHandle,
      [verifiedFlag]: false,
    })
    .eq('id', params.userId)
    .select('*')
    .single()

  if (error) {
    return { profile: null, error: mapProfileError(error) }
  }

  const parsed = ProfileRowSchema.safeParse(data)
  if (!parsed.success) {
    return { profile: null, error: new Error('Invalid profile data from server.') }
  }

  return { profile: parsed.data, error: null }
}

export async function markVerified(params: {
  userId: string
  platform: Platform
}): Promise<{ profile: Profile | null; error: Error | null }> {
  const verifiedFlag = verifiedColumn(params.platform)

  const { data, error } = await supabase
    .from('profiles')
    .update({ [verifiedFlag]: true })
    .eq('id', params.userId)
    .select('*')
    .single()

  if (error) {
    return { profile: null, error: new Error(error.message) }
  }

  const parsed = ProfileRowSchema.safeParse(data)
  if (!parsed.success) {
    return { profile: null, error: new Error('Invalid profile data from server.') }
  }

  return { profile: parsed.data, error: null }
}
