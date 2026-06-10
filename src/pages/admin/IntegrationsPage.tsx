import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReadOnly } from '../../components/rbac/ReadOnlyGuard'
import { integrationsApi } from '../../lib/api'
import { getCurrentCompanyId } from '../../lib/company'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Table } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import toast from 'react-hot-toast'
import type { Integration } from '../../types'
import { useEffect } from 'react'

const providerOptions = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'quickbooks', label: 'QuickBooks' },
  { value: 'xero', label: 'Xero' },
  { value: 'custom', label: 'Custom' },
]

const environmentOptions = [
  { value: 'sandbox', label: 'Sandbox' },
  { value: 'production', label: 'Production' },
]

const statusOptions = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

export function IntegrationsPage() {
  const queryClient = useQueryClient()
  const readOnly = useReadOnly()
  const [companyId, setCompanyId] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', provider: 'stripe', environment: 'sandbox', is_active: 'true' })

  useEffect(() => {
    getCurrentCompanyId().then((id) => setCompanyId(id))
  }, [])

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations', companyId],
    queryFn: () => integrationsApi.list(companyId || undefined),
    enabled: !!companyId,
  })

  const createMutation = useMutation({
    mutationFn: () => integrationsApi.create({
      company_id: companyId,
      name: form.name.trim(),
      provider: form.provider as Integration['provider'],
      environment: form.environment as Integration['environment'],
      is_active: form.is_active === 'true',
      settings: {},
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', companyId] })
      setShowCreate(false)
      setForm({ name: '', provider: 'stripe', environment: 'sandbox', is_active: 'true' })
      toast.success('Integration added')
    },
    onError: () => toast.error('Failed to add integration'),
  })

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'provider', header: 'Provider' },
    { key: 'environment', header: 'Environment' },
    {
      key: 'is_active', header: 'Status',
      render: (item: Integration) => item.is_active ? 'Active' : 'Inactive',
    },
    { key: 'last_sync_at', header: 'Last Synced' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Integrations</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage external payment and accounting integrations for your company.</p>
        </div>
        <Button disabled={readOnly || !companyId} onClick={() => setShowCreate(true)}>Add Integration</Button>
      </div>

      <Card>
        <p className="text-sm text-gray-500 mb-4">Integrations are scoped to your current company.</p>
        <Table columns={columns} data={integrations || []} loading={isLoading} emptyMessage="No integrations configured." />
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Integration" size="md">
        <form onSubmit={(e) => { e.preventDefault(); if (!readOnly) createMutation.mutate() }} className="space-y-4">
          <Input label="Integration Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Select label="Provider" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} options={providerOptions} />
          <Select label="Environment" value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })} options={environmentOptions} />
          <Select label="Status" value={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.value })} options={statusOptions} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Add</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
