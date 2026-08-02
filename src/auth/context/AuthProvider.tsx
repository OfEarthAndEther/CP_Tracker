import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { supabase } from '../../lib/supabase'

import { fetchProfile } from '../profile'
import type { Profile } from '../types'

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  profileLoading: boolean
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true)
    const { profile: nextProfile } = await fetchProfile(userId)
    setProfile(nextProfile)
    setProfileLoading(false)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      return
    }

    await loadProfile(user.id)
  }, [loadProfile, user])

  useEffect(() => {
    let mounted = true

    async function init() {
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) {
        return
      }

      if (error) {
        setLoading(false)
        return
      }

      const nextSession = data.session
      setSession(nextSession)
      setUser(nextSession?.user ?? null)

      if (nextSession?.user) {
        await loadProfile(nextSession.user.id)
      }

      if (mounted) {
        setLoading(false)
      }
    }

    void init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession: Session | null) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)

      if (nextSession?.user) {
        void loadProfile(nextSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      profileLoading,
      refreshProfile,
    }),
    [session, user, profile, loading, profileLoading, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
