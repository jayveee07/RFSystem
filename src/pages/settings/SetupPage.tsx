import { useState } from 'react'
import { seedDatabase, seedAdminUser } from '../../lib/seed'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export function SetupPage() {
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [adminUid, setAdminUid] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminName, setAdminName] = useState('')

  const handleSeed = async () => {
    setLoading(true)
    setResult(null)
    const res = await seedDatabase()
    setResult(res)
    setLoading(false)
  }

  const handleCreateAdmin = async () => {
    if (!adminUid.trim()) {
      setResult({ success: false, message: 'UID is required to create an admin user.' })
      return
    }

    setLoading(true)
    setResult(null)
    const res = await seedAdminUser(adminUid.trim(), adminEmail.trim() || undefined, adminName.trim() || undefined)
    setResult(res)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Setup</h1>
        <p className="text-gray-500 mt-1">Initialize Firestore with seed data (roles, permissions)</p>
      </div>

      <Card title="Database Migration" subtitle="Run this once to seed initial data">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This will create the default roles (Administrator, Finance Manager, Accountant, Auditor, Viewer)
            and all system permissions in Firestore. Safe to re-run (skips if already seeded).
          </p>

          <Button onClick={handleSeed} loading={loading} size="lg">
            {loading ? 'Seeding...' : 'Run Seed / Migration'}
          </Button>

          {result && (
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              <p className="font-medium">{result.success ? 'Success' : 'Error'}</p>
              <p className="text-sm mt-1">{result.message}</p>
            </div>
          )}
        </div>
      </Card>

      <Card title="Create Admin User" subtitle="Create or upgrade a Firestore user to Administrator">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            If your Auth account exists but there is no Firestore user record yet, enter the Firebase UID below and create an admin user record.
          </p>
          <p className="text-sm text-gray-500">
            This UID must be the Firebase Auth user's UID, and the user should already exist in Authentication.
          </p>

          <Input label="Firebase UID" value={adminUid} onChange={(e) => setAdminUid(e.target.value)} placeholder="svFZmyQVaAWeAygNaPfnruUYEqp1" />
          <Input label="Email (optional)" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@example.com" />
          <Input label="Full Name (optional)" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Administrator" />

          <Button onClick={handleCreateAdmin} loading={loading} disabled={!adminUid.trim()} size="lg">
            {loading ? 'Creating admin...' : 'Create Admin User'}
          </Button>

          {result && (
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              <p className="font-medium">{result.success ? 'Success' : 'Error'}</p>
              <p className="text-sm mt-1">{result.message}</p>
            </div>
          )}
        </div>
      </Card>

      <Card title="Firestore Collections" subtitle="Auto-created collections">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            'companies', 'users', 'roles', 'permissions',
            'bank_accounts', 'bank_statements', 'transactions',
            'reconciliation_matches', 'reconciliations', 'exceptions',
            'reconciliation_rules', 'approval_workflows', 'approval_requests',
            'audit_logs', 'notifications', 'reports', 'integrations',
            'payment_gateway_transactions', 'invoices', 'purchase_orders',
          ].map((col) => (
            <div key={col} className="px-3 py-2 bg-gray-50 rounded-lg text-sm font-mono text-gray-700">
              {col}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
