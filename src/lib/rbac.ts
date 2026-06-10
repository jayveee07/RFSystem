import type { Permission, Role, User } from '../types'

export type PermissionCode = string

const ROLE_PERMISSIONS: Record<string, PermissionCode[]> = {
  Administrator: ['*'],
  'Finance Manager': [
    'transactions.view',
    'transactions.import',
    'transactions.edit',
    'reconciliation.view',
    'reconciliation.create',
    'reconciliation.match',
    'reconciliation.approve',
    'exceptions.view',
    'exceptions.manage',
    'reports.view',
    'reports.export',
    'approvals.manage',
    'settings.view',
  ],
  Accountant: [
    'transactions.view',
    'transactions.import',
    'transactions.edit',
    'reconciliation.view',
    'reconciliation.create',
    'reconciliation.match',
    'exceptions.view',
    'exceptions.manage',
    'reports.view',
  ],
  Auditor: [
    'transactions.view',
    'reconciliation.view',
    'exceptions.view',
    'reports.view',
    'audit.view',
  ],
  Viewer: ['transactions.view', 'reconciliation.view', 'exceptions.view', 'reports.view'],
}

export type RolePermissionMap = Record<string, PermissionCode[]>

export function getUserRoles(userDoc: Partial<User> | null | undefined): Role[] {
  const roles = userDoc?.roles
  return Array.isArray(roles) ? (roles as Role[]) : []
}

export function roleHasPermission(role: Role, permission: Permission) {
  const allowed = ROLE_PERMISSIONS[role.name]
  if (!allowed) return false
  if (allowed.includes('*')) return true
  return allowed.includes(permission.code)
}

export function getUserPermissions(userDoc: Partial<User> | null | undefined): PermissionCode[] {
  const perms = (userDoc as any)?.permissions
  if (Array.isArray(perms)) return perms as PermissionCode[]

  const roles = getUserRoles(userDoc)
  const permissionSet = new Set<PermissionCode>()
  
  roles.forEach((role) => {
    const rolePerms = ROLE_PERMISSIONS[role.name]
    rolePerms?.forEach((code) => permissionSet.add(code))
  })

  return Array.from(permissionSet)
}

export function can(permissionCodes: PermissionCode[] | null | undefined, required: PermissionCode) {
  if (!permissionCodes) return false
  return permissionCodes.includes(required) || permissionCodes.includes('*')
}

export function isViewer(userDoc: Partial<User> | null | undefined): boolean {
  const roles = getUserRoles(userDoc)
  return roles.some((r) => r.name === 'Viewer')
}

export function isAdministrator(userDoc: Partial<User> | null | undefined): boolean {
  const roles = getUserRoles(userDoc)
  return roles.some((r) => r.name === 'Administrator')
}

export function hasRole(userDoc: Partial<User> | null | undefined, roleName: string) {
  const roles = getUserRoles(userDoc)
  return roles.some((r) => r.name === roleName)
}

