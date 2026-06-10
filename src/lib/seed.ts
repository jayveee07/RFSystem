import { addDoc, collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import type { Company, Role } from '../types'

// Run once to initialize Firestore with seed data.
// Call from a setup page or admin panel.
export async function seedDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    // Check if already seeded
    const rolesSnap = await getDocs(collection(db, 'roles'))
    if (!rolesSnap.empty) {
      return { success: true, message: 'Database already seeded. Roles exist.' }
    }

    const batch = writeBatch(db)

    // Seed Roles
    const roles = [
      { name: 'Administrator', description: 'Full system access', is_system: true },
      { name: 'Finance Manager', description: 'Can manage reconciliations and approve', is_system: true },
      { name: 'Accountant', description: 'Can perform reconciliations', is_system: true },
      { name: 'Auditor', description: 'Read-only access for auditing', is_system: true },
      { name: 'Viewer', description: 'Can only view reports and dashboards', is_system: true },
    ]
    const roleRefs = roles.map((r) => {
      const ref = doc(collection(db, 'roles'))
      batch.set(ref, r)
      return ref
    })

    // Seed Permissions
    const permissions = [
      { code: 'users.view', name: 'View Users', module: 'User Management', description: 'View user list and details' },
      { code: 'users.create', name: 'Create Users', module: 'User Management', description: 'Create new users' },
      { code: 'users.edit', name: 'Edit Users', module: 'User Management', description: 'Edit existing users' },
      { code: 'users.delete', name: 'Delete Users', module: 'User Management', description: 'Delete users' },
      { code: 'users.manage_roles', name: 'Manage Roles', module: 'User Management', description: 'Assign roles to users' },
      { code: 'transactions.view', name: 'View Transactions', module: 'Transactions', description: 'View transactions' },
      { code: 'transactions.import', name: 'Import Transactions', module: 'Transactions', description: 'Import transactions from files' },
      { code: 'transactions.edit', name: 'Edit Transactions', module: 'Transactions', description: 'Edit transaction details' },
      { code: 'transactions.delete', name: 'Delete Transactions', module: 'Transactions', description: 'Delete transactions' },
      { code: 'reconciliation.view', name: 'View Reconciliations', module: 'Reconciliation', description: 'View reconciliations' },
      { code: 'reconciliation.create', name: 'Create Reconciliation', module: 'Reconciliation', description: 'Create new reconciliations' },
      { code: 'reconciliation.match', name: 'Perform Matching', module: 'Reconciliation', description: 'Match transactions' },
      { code: 'reconciliation.approve', name: 'Approve Reconciliation', module: 'Reconciliation', description: 'Approve reconciliations' },
      { code: 'exceptions.view', name: 'View Exceptions', module: 'Exceptions', description: 'View exceptions' },
      { code: 'exceptions.manage', name: 'Manage Exceptions', module: 'Exceptions', description: 'Resolve and assign exceptions' },
      { code: 'rules.view', name: 'View Rules', module: 'Rules', description: 'View reconciliation rules' },
      { code: 'rules.manage', name: 'Manage Rules', module: 'Rules', description: 'Create, edit, delete rules' },
      { code: 'reports.view', name: 'View Reports', module: 'Reports', description: 'View and generate reports' },
      { code: 'reports.export', name: 'Export Reports', module: 'Reports', description: 'Export reports in various formats' },
      { code: 'audit.view', name: 'View Audit Logs', module: 'Audit', description: 'View audit logs' },
      { code: 'audit.export', name: 'Export Audit Logs', module: 'Audit', description: 'Export audit logs' },
      { code: 'settings.view', name: 'View Settings', module: 'Settings', description: 'View system settings' },
      { code: 'settings.manage', name: 'Manage Settings', module: 'Settings', description: 'Manage system settings' },
      { code: 'companies.view', name: 'View Companies', module: 'Companies', description: 'View company information' },
      { code: 'companies.manage', name: 'Manage Companies', module: 'Companies', description: 'Manage multiple companies' },
      { code: 'approvals.manage', name: 'Manage Approvals', module: 'Approvals', description: 'Manage approval workflows' },
      { code: 'integrations.manage', name: 'Manage Integrations', module: 'Integrations', description: 'Manage system integrations' },
    ]
    permissions.forEach((p) => {
      const ref = doc(collection(db, 'permissions'))
      batch.set(ref, p)
    })

    await batch.commit()
    return { success: true, message: `Database seeded: ${roles.length} roles, ${permissions.length} permissions created.` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, message: `Seed failed: ${msg}` }
  }
}

async function ensureRole(name: string, description: string): Promise<Role> {
  const rolesSnap = await getDocs(collection(db, 'roles'))
  const existing = rolesSnap.docs.find((d) => (d.data() as any).name === name)
  if (existing) {
    const data = existing.data() as Role
    return { ...data, id: existing.id }
  }

  const ref = await addDoc(collection(db, 'roles'), { name, description, is_system: true })
  return { id: ref.id, name, description, is_system: true }
}

async function ensureCompany(): Promise<Company> {
  const companiesSnap = await getDocs(collection(db, 'companies'))
  if (!companiesSnap.empty) {
    const existing = companiesSnap.docs[0]
    const data = existing.data() as Company
    return { ...data, id: existing.id }
  }

  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'companies'), {
    name: 'Default Company',
    code: `DEFAULT-${Date.now().toString(36).toUpperCase()}`,
    currency: 'USD',
    is_active: true,
    created_at: now,
    updated_at: now,
  })
  return {
    id: ref.id,
    name: 'Default Company',
    code: `DEFAULT-${Date.now().toString(36).toUpperCase()}`,
    currency: 'USD',
    is_active: true,
    created_at: now,
    updated_at: now,
  }
}

export async function seedAdminUser(uid: string, email?: string, fullName?: string): Promise<{ success: boolean; message: string }> {
  try {
    await seedDatabase()

    const adminRole = await ensureRole('Administrator', 'Full system access')
    const company = await ensureCompany()
    const existingUser = await getDoc(doc(db, 'users', uid))
    const now = new Date().toISOString()
    const createdAt = existingUser.exists() ? (existingUser.data() as any).created_at || now : now

    await setDoc(doc(db, 'users', uid), {
      id: uid,
      email: email ?? '',
      full_name: fullName ?? 'Administrator',
      company_id: company.id,
      roles: [adminRole],
      is_active: true,
      mfa_enabled: false,
      created_at: createdAt,
      updated_at: now,
    }, { merge: true })

    return { success: true, message: `Administrator created for uid ${uid} (users/${uid})` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, message: `Admin creation failed: ${msg}` }
  }
}
