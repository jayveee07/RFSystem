import { useMemo } from 'react'
import { useUserProfile } from '../../lib/profile'
import type { Permission, Role } from '../../types'
import { isViewer } from '../../lib/rbac'
import { ReadOnlyProvider } from './ReadOnlyGuard'

export function RbacProvider({ children }: { children: React.ReactNode }) {
  const { loading, user } = useUserProfile()

  const readOnly = useMemo(() => {
    if (!user) return true
    return isViewer(user)
  }, [user])

  // Note: permissions enforcement in routes will be introduced next; for now we only provide read-only flag.
  return <ReadOnlyProvider readOnly={readOnly || loading}>{children}</ReadOnlyProvider>
}

