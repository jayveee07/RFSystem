import { Navigate } from 'react-router-dom'
import { useUserProfile } from '../../lib/profile'
import type { Permission } from '../../types'

type Props = {
  permission: string
  children: React.ReactElement
}

export function RequirePermission({ permission, children }: Props) {
  const { loading, permissions } = useUserProfile()

  if (loading) return null
  if (!permissions.includes(permission)) return <Navigate to="/dashboard" replace />
  return children
}

