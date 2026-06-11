import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReadOnly } from '../../components/rbac/ReadOnlyGuard'
import { companiesApi } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import toast from 'react-hot-toast'
import type { Company } from '../../types'

export function CompaniesPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const readOnly = useReadOnly()

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.list(),
  })

  const [form, setForm] = useState({
    name: '', code: '', address: '', city: '', country: '', currency: 'USD',
  })

  const createMutation = useMutation({
    mutationFn: () => companiesApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      setShowCreate(false)
      setForm({ name: '', code: '', address: '', city: '', country: '', currency: 'USD' })
      toast.success('Company created')
    },
    onError: () => toast.error('Failed to create company'),
  })

  const columns = [
    { key: 'name', header: 'Company Name' },
    { key: 'code', header: 'Code' },
    { key: 'city', header: 'City' },
    { key: 'country', header: 'Country' },
    { key: 'currency', header: 'Currency' },
    {
      key: 'is_active', header: 'Status',
      render: (c: Company) => <Badge variant={c.is_active ? 'success' : 'default'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Companies</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Multi-company support - manage separate ledgers</p>
        </div>
        <Button disabled={readOnly} onClick={() => setShowCreate(true)}>Add Company</Button>
      </div>

      <Card>
        <Table columns={columns} data={companies || []} loading={isLoading} emptyMessage="No companies configured." />
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Company" size="md">
        <form onSubmit={(e) => { e.preventDefault(); if (readOnly) return; createMutation.mutate() }} className="space-y-4">
          <Input label="Company Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g., ACME" required />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
          <Input label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="USD" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
