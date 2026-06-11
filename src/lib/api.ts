import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  type User as AuthUser,
} from 'firebase/auth'
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, writeBatch,
  type DocumentData, type QueryConstraint,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import { generateReference } from './reference'
import type {
  Company, User, BankAccount, BankStatement, Transaction,
  ReconciliationMatch, Reconciliation, Exception, ReconciliationRule,
  ApprovalWorkflow, ApprovalRequest, AuditLog, Notification,
  Report, Integration, Permission, Role, PaymentGatewayTransaction, Invoice,
  DashboardStats, PurchaseOrder,
} from '../types'

type WithId<T> = T & { id: string }

export function getAuthErrorMessage(error: unknown): string {
  const code = ((error as { code?: string })?.code ?? '') as string
  const messages: Record<string, string> = {
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/invalid-email': 'Invalid email address',
    'auth/user-disabled': 'This account has been disabled',
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/weak-password': 'Password must be at least 6 characters',
    'auth/too-many-requests': 'Too many attempts. Please try again later',
    'auth/network-request-failed': 'Network error. Check your connection',
    'auth/requires-recent-login': 'Please log in again before updating your password',
  }
  return messages[code] || (error instanceof Error ? error.message : 'An unexpected error occurred')
}

const col = (name: string) => collection(db, name)
const docRef = (name: string, id: string) => doc(db, name, id)
const snap = <T>(d: DocumentData, id: string) => ({ id, ...d } as unknown as WithId<T>)

// Auth
export const authApi = {
  signUp: async (email: string, password: string, fullName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)

    const rolesSnap = await getDocs(query(col('roles'), where('name', '==', 'Administrator'), limit(1)))
    const adminRole = rolesSnap.docs.length > 0
      ? { id: rolesSnap.docs[0].id, ...rolesSnap.docs[0].data() } as Role
      : { id: '', name: 'Administrator', description: 'Full system access', is_system: true } as Role

    const c = await addDoc(col('companies'), {
      name: `${fullName}'s Company`,
      code: `C${Date.now().toString(36).toUpperCase()}`,
      currency: 'USD',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    await setDoc(docRef('users', cred.user.uid), {
      id: cred.user.uid,
      email,
      full_name: fullName,
      company_id: c.id,
      roles: [adminRole],
      is_active: true,
      mfa_enabled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    return cred.user
  },

  signIn: async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    await setDoc(docRef('users', cred.user.uid), {
      last_login_at: new Date().toISOString(),
    }, { merge: true })
    return cred.user
  },

  signOut: async () => { await fbSignOut(auth) },

  resetPassword: async (email: string) => {
    await sendPasswordResetEmail(auth, email)
  },

  getCurrentUser: async (): Promise<WithId<Record<string, unknown>> | null> => {
    const user = auth.currentUser
    if (!user) return null
    const d = await getDoc(docRef('users', user.uid))
    if (!d.exists()) return null
    return snap<Record<string, unknown>>(d.data(), d.id)
  },
}

// Users
export const usersApi = {
  list: async (companyId?: string) => {
    const constraints: QueryConstraint[] = []
    if (companyId) constraints.push(where('company_id', '==', companyId))
    const q = query(col('users'), ...constraints)
    const s = await getDocs(q)
    return s.docs.map(d => snap<User>(d.data(), d.id))
  },

  get: async (id: string) => {
    const d = await getDoc(docRef('users', id))
    if (!d.exists()) throw new Error('User not found')
    return snap<User>(d.data(), d.id)
  },

  update: async (id: string, updates: Partial<User>) => {
    await updateDoc(docRef('users', id), { ...updates, updated_at: new Date().toISOString() })
    return usersApi.get(id)
  },

  deactivate: async (id: string) => {
    await updateDoc(docRef('users', id), { is_active: false, updated_at: new Date().toISOString() })
  },

  create: async (id: string, data: Partial<User>) => {
    const now = new Date().toISOString()
    await setDoc(docRef('users', id), {
      id,
      email: data.email ?? '',
      full_name: data.full_name ?? '',
      company_id: data.company_id ?? '',
      roles: data.roles ?? [],
      is_active: data.is_active ?? true,
      mfa_enabled: data.mfa_enabled ?? false,
      created_at: now,
      updated_at: now,
      ...data,
    })
    return usersApi.get(id)
  },
}

export const rolesApi = {
  list: async () => {
    const q = query(col('roles'), orderBy('name'))
    const s = await getDocs(q)
    return s.docs.map(d => snap<Role>(d.data(), d.id))
  },

  get: async (id: string) => {
    const d = await getDoc(docRef('roles', id))
    if (!d.exists()) throw new Error('Role not found')
    return snap<Role>(d.data(), d.id)
  },

  create: async (data: Partial<Role>) => {
    const now = new Date().toISOString()
    const r = await addDoc(col('roles'), { ...data, is_system: data.is_system ?? false, created_at: now, updated_at: now })
    return rolesApi.get(r.id)
  },

  update: async (id: string, updates: Partial<Role>) => {
    await updateDoc(docRef('roles', id), { ...updates, updated_at: new Date().toISOString() })
    return rolesApi.get(id)
  },
}

export const permissionsApi = {
  list: async () => {
    const q = query(col('permissions'), orderBy('name'))
    const s = await getDocs(q)
    return s.docs.map(d => snap<Permission>(d.data(), d.id))
  },

  get: async (id: string) => {
    const d = await getDoc(docRef('permissions', id))
    if (!d.exists()) throw new Error('Permission not found')
    return snap<Permission>(d.data(), d.id)
  },

  create: async (data: Partial<Permission>) => {
    const now = new Date().toISOString()
    const r = await addDoc(col('permissions'), { ...data, created_at: now, updated_at: now })
    return permissionsApi.get(r.id)
  },

  update: async (id: string, updates: Partial<Permission>) => {
    await updateDoc(docRef('permissions', id), { ...updates, updated_at: new Date().toISOString() })
    return permissionsApi.get(id)
  },
}

export const integrationsApi = {
  list: async (companyId?: string) => {
    const constraints: QueryConstraint[] = [orderBy('name')]
    if (companyId) constraints.push(where('company_id', '==', companyId))
    const q = query(col('integrations'), ...constraints)
    const s = await getDocs(q)
    return s.docs.map(d => snap<Integration>(d.data(), d.id))
  },

  get: async (id: string) => {
    const d = await getDoc(docRef('integrations', id))
    if (!d.exists()) throw new Error('Integration not found')
    return snap<Integration>(d.data(), d.id)
  },

  create: async (data: Partial<Integration>) => {
    const now = new Date().toISOString()
    const r = await addDoc(col('integrations'), {
      ...data,
      settings: data.settings ?? {},
      is_active: data.is_active ?? true,
      created_at: now,
      updated_at: now,
    })
    return integrationsApi.get(r.id)
  },

  update: async (id: string, updates: Partial<Integration>) => {
    await updateDoc(docRef('integrations', id), { ...updates, updated_at: new Date().toISOString() })
    return integrationsApi.get(id)
  },
}

// Companies
export const companiesApi = {
  list: async () => {
    const s = await getDocs(col('companies'))
    return s.docs.map(d => snap<Company>(d.data(), d.id))
  },

  get: async (id: string) => {
    const d = await getDoc(docRef('companies', id))
    if (!d.exists()) throw new Error('Company not found')
    return snap<Company>(d.data(), d.id)
  },

  create: async (data: Partial<Company>) => {
    const r = await addDoc(col('companies'), { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    return companiesApi.get(r.id)
  },

  update: async (id: string, updates: Partial<Company>) => {
    await updateDoc(docRef('companies', id), { ...updates, updated_at: new Date().toISOString() })
    return companiesApi.get(id)
  },
}

// Bank Accounts
export const bankAccountsApi = {
  list: async (companyId?: string) => {
    const constraints: QueryConstraint[] = []
    if (companyId) constraints.push(where('company_id', '==', companyId))
    const q = query(col('bank_accounts'), ...constraints)
    const s = await getDocs(q)
    return s.docs.map(d => snap<BankAccount>(d.data(), d.id))
  },

  create: async (data: Partial<BankAccount>) => {
    const r = await addDoc(col('bank_accounts'), { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    return bankAccountsApi.get(r.id)
  },

  update: async (id: string, updates: Partial<BankAccount>) => {
    await updateDoc(docRef('bank_accounts', id), { ...updates, updated_at: new Date().toISOString() })
    return bankAccountsApi.get(id)
  },

  get: async (id: string) => {
    const d = await getDoc(docRef('bank_accounts', id))
    if (!d.exists()) throw new Error('Bank account not found')
    return snap<BankAccount>(d.data(), d.id)
  },
}

// Transactions
export const transactionsApi = {
  list: async (params?: { companyId?: string; status?: string; bankAccountId?: string; limit?: number; offset?: number }) => {
    const constraints: QueryConstraint[] = []
    
    // Only add companyId filter if provided and not empty
    if (params?.companyId) {
      constraints.push(where('company_id', '==', params.companyId))
    }
    
    if (params?.status) constraints.push(where('status', '==', params.status))
    if (params?.bankAccountId) constraints.push(where('bank_account_id', '==', params.bankAccountId))
    
    const q = query(col('transactions'), ...constraints)
    const s = await getDocs(q)
    const data = s.docs.map(d => snap<Transaction>(d.data(), d.id))
    
    data.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
    
    const all = params?.limit ? data.slice(params.offset || 0, (params.offset || 0) + params.limit) : data
    return { data: all, count: data.length }
  },

  get: async (id: string) => {
    const d = await getDoc(docRef('transactions', id))
    if (!d.exists()) throw new Error('Transaction not found')
    return snap<Transaction>(d.data(), d.id)
  },

  create: async (data: Partial<Transaction>) => {
    const ref = generateReference()
    const r = await addDoc(col('transactions'), { ...data, reference_number: data.reference_number || ref, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    return transactionsApi.get(r.id)
  },

  bulkCreate: async (items: Partial<Transaction>[]) => {
    const b = writeBatch(db)
    const ids: string[] = []
    for (const item of items) {
      const ref = generateReference()
      const r = doc(col('transactions'))
      b.set(r, { ...item, reference_number: item.reference_number || ref, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      ids.push(r.id)
    }
    await b.commit()
    return Promise.all(ids.map(id => transactionsApi.get(id)))
  },

  update: async (id: string, updates: Partial<Transaction>) => {
    await updateDoc(docRef('transactions', id), { ...updates, updated_at: new Date().toISOString() })
    return transactionsApi.get(id)
  },

  delete: async (id: string) => {
    await deleteDoc(docRef('transactions', id))
  },

  getImportLogs: async (companyId: string) => {
    const q = query(col('import_logs'), where('company_id', '==', companyId), orderBy('created_at', 'desc'))
    const s = await getDocs(q)
    return s.docs.map(d => snap<any>(d.data(), d.id))
  },

  detectDuplicates: async (companyId: string) => {
    const q = query(col('transactions'), where('company_id', '==', companyId))
    const s = await getDocs(q)
    const txs = s.docs.map(d => snap<Transaction>(d.data(), d.id))
    const groups = new Map<string, Transaction[]>()
    txs.forEach(tx => {
      const key = `${tx.transaction_date}_${tx.amount}_${tx.bank_account_id}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(tx)
    })
    return Array.from(groups.values()).filter(group => group.length > 1)
  }
}

// Bank Statements
export const bankStatementsApi = {
  list: async (companyId?: string) => {
    const constraints: QueryConstraint[] = [orderBy('statement_date', 'desc')]
    if (companyId) constraints.push(where('company_id', '==', companyId))
    const q = query(col('bank_statements'), ...constraints)
    const s = await getDocs(q)
    return s.docs.map(d => snap<BankStatement>(d.data(), d.id))
  },

  create: async (data: Partial<BankStatement>) => {
    const r = await addDoc(col('bank_statements'), { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    return r.id
  },

  get: async (id: string) => {
    const d = await getDoc(docRef('bank_statements', id))
    if (!d.exists()) throw new Error('Bank statement not found')
    return snap<BankStatement>(d.data(), d.id)
  },

  update: async (id: string, updates: Partial<BankStatement>) => {
    await updateDoc(docRef('bank_statements', id), { ...updates, updated_at: new Date().toISOString() })
    return bankStatementsApi.get(id)
  },

  delete: async (id: string) => {
    await deleteDoc(docRef('bank_statements', id))
  },
}

// Reconciliations
export const reconciliationsApi = {
  list: async (companyId?: string) => {
    const constraints: QueryConstraint[] = [orderBy('reconciliation_date', 'desc')]
    if (companyId) constraints.push(where('company_id', '==', companyId))
    const q = query(col('reconciliations'), ...constraints)
    const s = await getDocs(q)
    return s.docs.map(d => snap<Reconciliation>(d.data(), d.id))
  },

  get: async (id: string) => {
    const d = await getDoc(docRef('reconciliations', id))
    if (!d.exists()) throw new Error('Reconciliation not found')
    return snap<Reconciliation>(d.data(), d.id)
  },

  create: async (data: Partial<Reconciliation>) => {
    const r = await addDoc(col('reconciliations'), { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    return reconciliationsApi.get(r.id)
  },

  update: async (id: string, updates: Partial<Reconciliation>) => {
    await updateDoc(docRef('reconciliations', id), { ...updates, updated_at: new Date().toISOString() })
    return reconciliationsApi.get(id)
  },
}

// Reconciliation Matches
export const matchesApi = {
  list: async (reconciliationId?: string) => {
    const constraints: QueryConstraint[] = []
    if (reconciliationId) constraints.push(where('reconciliation_id', '==', reconciliationId))
    const q = query(col('reconciliation_matches'), ...constraints)
    const s = await getDocs(q)
    return s.docs.map(d => snap<ReconciliationMatch>(d.data(), d.id))
  },

  create: async (data: Partial<ReconciliationMatch>) => {
    const r = await addDoc(col('reconciliation_matches'), { ...data, created_at: new Date().toISOString() })
    return r.id
  },

  get: async (id: string) => {
    const d = await getDoc(docRef('reconciliation_matches', id))
    if (!d.exists()) throw new Error('Match not found')
    return snap<ReconciliationMatch>(d.data(), d.id)
  },

  updateStatus: async (id: string, matchStatus: 'confirmed' | 'rejected') => {
    await updateDoc(docRef('reconciliation_matches', id), { match_status: matchStatus })
  },
}

// Exceptions
export const exceptionsApi = {
  list: async (params?: { companyId?: string; status?: string }) => {
    const constraints: QueryConstraint[] = [orderBy('created_at', 'desc')]
    if (params?.companyId) constraints.push(where('company_id', '==', params.companyId))
    if (params?.status) constraints.push(where('status', '==', params.status))
    const q = query(col('exceptions'), ...constraints)
    const s = await getDocs(q)
    return s.docs.map(d => snap<Exception>(d.data(), d.id))
  },

  get: async (id: string) => {
    const d = await getDoc(docRef('exceptions', id))
    if (!d.exists()) throw new Error('Exception not found')
    return snap<Exception>(d.data(), d.id)
  },

  update: async (id: string, updates: Partial<Exception>) => {
    await updateDoc(docRef('exceptions', id), { ...updates, updated_at: new Date().toISOString() })
    const d = await getDoc(docRef('exceptions', id))
    return snap<Exception>(d.data()!, d.id)
  },

  addComment: async (exceptionId: string, userId: string, comment: string) => {
    const ref = collection(db, 'exceptions', exceptionId, 'comments')
    await addDoc(ref, { user_id: userId, comment, created_at: new Date().toISOString() })
  },
}

// Rules
export const rulesApi = {
  list: async (companyId?: string) => {
    const constraints: QueryConstraint[] = [orderBy('match_priority')]
    if (companyId) constraints.push(where('company_id', '==', companyId))
    const q = query(col('reconciliation_rules'), ...constraints)
    const s = await getDocs(q)
    return s.docs.map(d => snap<ReconciliationRule>(d.data(), d.id))
  },

  create: async (data: Partial<ReconciliationRule>) => {
    const r = await addDoc(col('reconciliation_rules'), { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    const d = await getDoc(docRef('reconciliation_rules', r.id))
    return snap<ReconciliationRule>(d.data()!, d.id)
  },

  update: async (id: string, updates: Partial<ReconciliationRule>) => {
    await updateDoc(docRef('reconciliation_rules', id), { ...updates, updated_at: new Date().toISOString() })
    const d = await getDoc(docRef('reconciliation_rules', id))
    return snap<ReconciliationRule>(d.data()!, d.id)
  },

  delete: async (id: string) => {
    await deleteDoc(docRef('reconciliation_rules', id))
  },
}

// Approvals
export const approvalsApi = {
  listWorkflows: async (companyId?: string) => {
    const constraints: QueryConstraint[] = []
    if (companyId) constraints.push(where('company_id', '==', companyId))
    const q = query(col('approval_workflows'), ...constraints)
    const s = await getDocs(q)
    return s.docs.map(d => snap<ApprovalWorkflow>(d.data(), d.id))
  },

  listRequests: async (companyId?: string) => {
    const constraints: QueryConstraint[] = [orderBy('requested_at', 'desc')]
    if (companyId) constraints.push(where('company_id', '==', companyId))
    const q = query(col('approval_requests'), ...constraints)
    const s = await getDocs(q)
    return s.docs.map(d => snap<ApprovalRequest>(d.data(), d.id))
  },

  createRequest: async (data: Partial<ApprovalRequest>) => {
    const r = await addDoc(col('approval_requests'), { ...data, created_at: new Date().toISOString() })
    return r.id
  },

  approve: async (id: string) => {
    await updateDoc(docRef('approval_requests', id), { status: 'approved', completed_at: new Date().toISOString() })
  },

  reject: async (id: string, comment?: string) => {
    await updateDoc(docRef('approval_requests', id), { status: 'rejected', completed_at: new Date().toISOString(), notes: comment || '' })
  },
}

// Audit Logs
export const auditLogsApi = {
  list: async (params?: { companyId?: string; limitCount?: number; startDate?: string; endDate?: string }) => {
    const constraints: QueryConstraint[] = [orderBy('created_at', 'desc')]
    if (params?.companyId) constraints.push(where('company_id', '==', params.companyId))
    if (params?.startDate) constraints.push(where('created_at', '>=', params.startDate))
    if (params?.endDate) constraints.push(where('created_at', '<=', params.endDate))
    if (params?.limitCount) constraints.push(limit(params.limitCount))
    const q = query(col('audit_logs'), ...constraints)
    const s = await getDocs(q)
    return s.docs.map(d => snap<AuditLog>(d.data(), d.id))
  },

  get: async (id: string) => {
    const d = await getDoc(docRef('audit_logs', id))
    if (!d.exists()) throw new Error('Audit log not found')
    return snap<AuditLog>(d.data(), d.id)
  },

  create: async (data: Partial<AuditLog>) => {
    await addDoc(col('audit_logs'), { ...data, created_at: new Date().toISOString() })
  },
}

// Notifications
export const notificationsApi = {
  list: async (userId: string) => {
    const q = query(col('notifications'), where('user_id', '==', userId), orderBy('created_at', 'desc'), limit(50))
    const s = await getDocs(q)
    return s.docs.map(d => snap<Notification>(d.data(), d.id))
  },

  markRead: async (id: string) => {
    await updateDoc(docRef('notifications', id), { is_read: true })
  },

  markAllRead: async (userId: string) => {
    const q = query(col('notifications'), where('user_id', '==', userId), where('is_read', '==', false))
    const s = await getDocs(q)
    const b = writeBatch(db)
    s.docs.forEach(d => b.update(d.ref, { is_read: true }))
    await b.commit()
  },

  create: async (data: Partial<Notification>) => {
    const r = await addDoc(col('notifications'), { ...data, is_read: false, created_at: new Date().toISOString() })
    return r.id
  },

  getUnreadCount: async (userId: string) => {
    const q = query(col('notifications'), where('user_id', '==', userId), where('is_read', '==', false))
    const s = await getDocs(q)
    return s.size
  },
}

// Reports
export const reportsApi = {
  list: async (companyId?: string) => {
    const constraints: QueryConstraint[] = [orderBy('created_at', 'desc')]
    if (companyId) constraints.push(where('company_id', '==', companyId))
    const q = query(col('reports'), ...constraints)
    const s = await getDocs(q)
    return s.docs.map(d => snap<Report>(d.data(), d.id))
  },

  create: async (data: Partial<Report>) => {
    const r = await addDoc(col('reports'), { ...data, created_at: new Date().toISOString() })
    const d = await getDoc(docRef('reports', r.id))
    return snap<Report>(d.data()!, d.id)
  },

  get: async (id: string) => {
    const d = await getDoc(docRef('reports', id))
    if (!d.exists()) throw new Error('Report not found')
    return snap<Report>(d.data(), d.id)
  },

  update: async (id: string, updates: Partial<Report>) => {
    await updateDoc(docRef('reports', id), { ...updates, updated_at: new Date().toISOString() })
    return reportsApi.get(id)
  },

  delete: async (id: string) => {
    await deleteDoc(docRef('reports', id))
  },
}

// Dashboard
export const dashboardApi = {
  getStats: async (companyId: string): Promise<DashboardStats> => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [txSnap, recSnap, excSnap, bankSnap, auditSnap, trendSnap] = await Promise.all([
      getDocs(query(col('transactions'), where('company_id', '==', companyId))),
      getDocs(query(col('reconciliations'), where('company_id', '==', companyId))),
      getDocs(query(col('exceptions'), where('company_id', '==', companyId), where('status', '!=', 'closed'))),
      getDocs(query(col('bank_accounts'), where('company_id', '==', companyId))),
      getDocs(query(col('audit_logs'), where('company_id', '==', companyId), orderBy('created_at', 'desc'), limit(10))),
      getDocs(query(col('transactions'), where('company_id', '==', companyId), where('created_at', '>=', thirtyDaysAgo), orderBy('created_at'))),
    ])

    const transactions = txSnap.docs.map(d => snap<Transaction>(d.data(), d.id))
    const reconciliations = recSnap.docs.map(d => snap<Reconciliation>(d.data(), d.id))
    const bankAccounts = bankSnap.docs.map(d => snap<BankAccount>(d.data(), d.id))

    const totalTransactions = transactions.length
    const totalMatched = transactions.filter(t => t.status === 'matched' || t.status === 'reconciled').length
    const totalUnmatched = transactions.filter(t => t.status === 'unreconciled').length
    const pendingReconciliations = reconciliations.filter(r => r.status === 'draft' || r.status === 'pending_approval').length
    const completedReconciliations = reconciliations.filter(r => r.status === 'completed').length
    const exceptionCount = excSnap.size
    const errorRate = totalTransactions ? (exceptionCount / totalTransactions) * 100 : 0
    const bankBalances = bankAccounts.reduce((sum, a) => sum + Number(a.current_balance), 0)

    const trendMap = new Map<string, { matched: number; unmatched: number }>()
    trendSnap.docs.forEach(d => {
      const tx = d.data() as Record<string, unknown>
      const date = ((tx.created_at as string) || '').split('T')[0]
      if (!trendMap.has(date)) trendMap.set(date, { matched: 0, unmatched: 0 })
      const entry = trendMap.get(date)!
      if (tx.status === 'matched' || tx.status === 'reconciled') entry.matched++
      else if (tx.status === 'unreconciled') entry.unmatched++
    })
    const reconciliationTrend = Array.from(trendMap.entries()).map(([date, vals]) => ({ date, ...vals }))

    return {
      total_transactions: totalTransactions,
      pending_reconciliations: pendingReconciliations,
      completed_reconciliations: completedReconciliations,
      error_rate: Math.round(errorRate * 100) / 100,
      total_matched: totalMatched,
      total_unmatched: totalUnmatched,
      bank_balances: bankBalances,
      recent_activities: auditSnap.docs.map(d => snap<AuditLog>(d.data(), d.id)),
      reconciliation_trend: reconciliationTrend,
    }
  },
}

// Admin
export const adminApi = {
  getSystemStats: async () => {
    const [usersSnap, companiesSnap, exceptionsSnap] = await Promise.all([
      getDocs(col('users')),
      getDocs(col('companies')),
      getDocs(query(col('exceptions'), where('status', '==', 'failed')))
    ])

    return {
      total_users: usersSnap.size,
      active_users: usersSnap.docs.filter(d => d.data().is_active).length,
      failed_imports: exceptionsSnap.size,
      total_companies: companiesSnap.size,
      system_status: 'healthy'
    }
  }
}

// Security
export const securityApi = {
  getSecurityStats: async (companyId: string) => {
    // Mock data for now, actual implementation would query users, sessions, etc.
    const usersSnap = await getDocs(query(col('users'), where('company_id', '==', companyId)));
    const totalUsers = usersSnap.size;
    const mfaEnabledUsers = usersSnap.docs.filter(d => d.data().mfa_enabled).length;

    // Simulate active sessions and recent security alerts
    const activeSessions = Math.floor(Math.random() * 10) + 1; // 1 to 10 active sessions
    const securityAlerts = Math.floor(Math.random() * 3); // 0 to 2 alerts

    return {
      total_users: totalUsers,
      mfa_enabled_users: mfaEnabledUsers,
      active_sessions: activeSessions,
      security_alerts: securityAlerts,
      last_security_review: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
    }
  },

  getLoginAttempts: async (companyId: string, params?: { limitCount?: number }) => {
    // Mock data for login attempts
    const mockAttempts = [
      { id: 'la1', user_id: 'user1', email: 'user1@example.com', ip_address: '192.168.1.1', status: 'success', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
      { id: 'la2', user_id: 'user2', email: 'user2@example.com', ip_address: '192.168.1.2', status: 'failed', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
      { id: 'la3', user_id: 'user1', email: 'user1@example.com', ip_address: '192.168.1.1', status: 'success', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
      { id: 'la4', user_id: 'unknown', email: 'hacker@example.com', ip_address: '203.0.113.45', status: 'failed', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
      { id: 'la5', user_id: 'user3', email: 'user3@example.com', ip_address: '192.168.1.3', status: 'success', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    ];
    const limitedAttempts = params?.limitCount ? mockAttempts.slice(0, params.limitCount) : mockAttempts;
    return limitedAttempts.map(d => snap<any>(d, d.id));
  }
}

// Analytics
export const analyticsApi = {
  getPerformanceMetrics: async (companyId: string) => {
    // Mock data for analytics KPIs
    return {
      average_match_time: '1.2h',
      auto_reconciliation_rate: '84%',
      manual_intervention_rate: '16%',
      cost_savings_estimated: 4500,
    }
  },
  getTrendData: async (companyId: string) => {
    // Mock trend data for charts
    return [
      { month: 'Jan', processed: 450, exceptions: 20 },
      { month: 'Feb', processed: 520, exceptions: 15 },
      { month: 'Mar', processed: 600, exceptions: 35 },
      { month: 'Apr', processed: 580, exceptions: 10 },
    ]
  }
}

// AI
export const aiApi = {
  getInsights: async (companyId: string) => {
    // Mock AI-generated insights
    return [
      { id: 'insight-1', title: 'Anomaly Detected', description: '3 transactions from Bank of America show unusual metadata patterns compared to historical data.', severity: 'high', confidence: 0.94 },
      { id: 'insight-2', title: 'Matching Rule Optimization', description: 'Suggested: Merge Rules "Invoice Match" and "Amount Match" to reduce processing time by 12%.', severity: 'medium', confidence: 0.88 }
    ]
  }
}

// Payment Gateway
export const paymentGatewayApi = {
  list: async (companyId?: string) => {
    const constraints: QueryConstraint[] = [orderBy('transaction_date', 'desc')]
    if (companyId) constraints.push(where('company_id', '==', companyId))
    const q = query(col('payment_gateway_transactions'), ...constraints)
    const s = await getDocs(q)
    return s.docs.map(d => snap<PaymentGatewayTransaction>(d.data(), d.id))
  },

  get: async (id: string) => {
    const d = await getDoc(docRef('payment_gateway_transactions', id))
    if (!d.exists()) throw new Error('Payment gateway transaction not found')
    return snap<PaymentGatewayTransaction>(d.data(), d.id)
  },
}

// Invoices
export const invoicesApi = {
  list: async (companyId?: string) => {
    const constraints: QueryConstraint[] = [orderBy('invoice_date', 'desc')]
    if (companyId) constraints.push(where('company_id', '==', companyId))
    const q = query(col('invoices'), ...constraints)
    const s = await getDocs(q)
    return s.docs.map(d => snap<Invoice>(d.data(), d.id))
  },

  get: async (id: string) => {
    const d = await getDoc(docRef('invoices', id))
    if (!d.exists()) throw new Error('Invoice not found')
    return snap<Invoice>(d.data(), d.id)
  },

  create: async (data: Partial<Invoice>) => {
    const r = await addDoc(col('invoices'), { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    return invoicesApi.get(r.id)
  },

  update: async (id: string, updates: Partial<Invoice>) => {
    await updateDoc(docRef('invoices', id), { ...updates, updated_at: new Date().toISOString() })
    return invoicesApi.get(id)
  },

  delete: async (id: string) => {
    await deleteDoc(docRef('invoices', id))
  },
}

// Purchase Orders
export const purchaseOrdersApi = {
  list: async (companyId?: string) => {
    const constraints: QueryConstraint[] = [orderBy('order_date', 'desc')]
    if (companyId) constraints.push(where('company_id', '==', companyId))
    const q = query(col('purchase_orders'), ...constraints)
    const s = await getDocs(q)
    return s.docs.map(d => snap<PurchaseOrder>(d.data(), d.id))
  },

  get: async (id: string) => {
    const d = await getDoc(docRef('purchase_orders', id))
    if (!d.exists()) throw new Error('Purchase order not found')
    return snap<PurchaseOrder>(d.data(), d.id)
  },

  create: async (data: Partial<PurchaseOrder>) => {
    const now = new Date().toISOString()
    const r = await addDoc(col('purchase_orders'), {
      ...data,
      created_at: now,
      updated_at: now,
    })
    return purchaseOrdersApi.get(r.id)
  },

  update: async (id: string, updates: Partial<PurchaseOrder>) => {
    await updateDoc(docRef('purchase_orders', id), { ...updates, updated_at: new Date().toISOString() })
    return purchaseOrdersApi.get(id)
  },

  delete: async (id: string) => {
    await deleteDoc(docRef('purchase_orders', id))
  },
}

// Audit Logs - get single
export function getAuditLog(id: string) {
  return auditLogsApi.get(id)
}
