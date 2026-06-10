import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { getUserPermissions } from './rbac'
import type { Role, User } from '../types'

type UserProfile = {
  loading: boolean
  user: User | null
  permissions: string[]
  roles: Role[]
}

export function useUserProfile(): UserProfile {
  const [state, setState] = useState<UserProfile>({
    loading: true,
    user: null,
    permissions: [],
    roles: [],
  })

  useEffect(() => {
    let alive = true

    async function loadUser(u: FirebaseUser | null) {
      if (!alive) return
      if (!u) {
        setState({ loading: false, user: null, permissions: [], roles: [] })
        return
      }

      try {
        const snap = await getDoc(doc(db, 'users', u.uid))
        if (!snap.exists()) {
          if (!alive) return
          setState({ loading: false, user: null, permissions: [], roles: [] })
          return
        }

        const data = snap.data() as Partial<User> & { permissions?: string[] }
        const roles = Array.isArray(data.roles) ? (data.roles as Role[]) : []
        const permissions = Array.isArray(data.permissions)
          ? (data.permissions as string[])
          : getUserPermissions({ ...data, roles })

        if (!alive) return
        setState({ loading: false, user: data as User, permissions, roles })
      } catch {
        if (!alive) return
        setState({ loading: false, user: null, permissions: [], roles: [] })
      }
    }

    const unsubscribe = onAuthStateChanged(auth, loadUser)
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  return state
}

