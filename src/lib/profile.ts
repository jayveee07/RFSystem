import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react'
import { doc, onSnapshot, type DocumentSnapshot } from 'firebase/firestore'
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

function processUserDoc(snap: DocumentSnapshot, uid: string): UserProfile | null {
  if (!snap.exists()) return null
  const data = snap.data()
  if (!data) return null

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

  return { loading: false, user, permissions, roles }
}

export function UserProfileProvider({ children, uid }: { children: ReactNode; uid: string }) {
  const [state, setState] = useState<UserProfile>({
    loading: true,
    user: null,
    permissions: [],
    roles: [],
  })

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
      const profile = processUserDoc(snap, uid)
      if (profile) {
        setState(profile)
      } else {
        setState({ loading: false, user: null, permissions: [], roles: [] })
      }
    }, () => {
      setState({ loading: false, user: null, permissions: [], roles: [] })
    })
    return unsub
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

