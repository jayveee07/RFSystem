import type React from 'react'
import { RequirePermission } from './RequirePermission'

// Convenience wrapper for conditional rendering
export function RequirePermissionElement({ permission, children }: { permission: string; children: React.ReactElement }) {
  return <RequirePermission permission={permission}>{children}</RequirePermission>
}

