import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'
import { getUserPermissions } from './rbac'
import type { Role, User } from '../types'

type UserProfile = {
  loading: boolean
  user: User | null
  permissions: string[]
  roles: Role[]
}

const UserProfileContext = createContext<UserProfile | null>(null)

export function UserProfileProvider({ children, uid }: { children: ReactNode; uid: string }) {
  const [state, setState] = useState<UserProfile>({
    loading: true,
    user: null,
    permissions: [],
    roles: [],
  })

  useEffect(() => {
    let alive = true

    async function loadUser() {
      try {
        const snap = await getDoc(doc(db, 'users', uid))
        if (!snap.exists()) {
          if (!alive) return
          setState({ loading: false, user: null, permissions: [], roles: [] })
          return
        }

        const data = snap.data()
        if (!data) {
          if (!alive) return
          setState({ loading: false, user: null, permissions: [], roles: [] })
          return
        }

        const rawRoles = data.roles
        const roles: Role[] = Array.isArray(rawRoles)
          ? rawRoles.filter((r): r is Role => r && typeof r === 'object' && 'id' in r)
          : []

        const rawPermissions = data.permissions
        const permissions: string[] = Array.isArray(rawPermissions)
          ? rawPermissions.filter((p): p is string => typeof p === 'string')
          : getUserPermissions({ ...data, roles } as Partial<User>)

        const user: User = {
          id: data.id || uid,
          email: data.email || '',
          full_name: data.full_name || '',
          is_active: data.is_active ?? true,
          mfa_enabled: data.mfa_enabled ?? false,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
          roles,
        }

        if (!alive) return
        setState({ loading: false, user, permissions, roles })
      } catch {
        if (!alive) return
        setState({ loading: false, user: null, permissions: [], roles: [] })
      }
    }

    loadUser()
    return () => { alive = false }
  }, [uid])

  return createElement(UserProfileContext.Provider, { value: state }, children)
}

export function useUserProfile(): UserProfile {
  const ctx = useContext(UserProfileContext)
  if (!ctx) {
    throw new Error('useUserProfile must be used within a UserProfileProvider')
  }
  return ctx
}

