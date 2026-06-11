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
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import toast from 'react-hot-toast'
import type { Company } from '../../types'

export function CompaniesPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editCompany, setEditCompany] = useState<Company | null>(null)
  const [deleteCompany, setDeleteCompany] = useState<Company | null>(null)
  const readOnly = useReadOnly()

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.list(),
  })

  const [form, setForm] = useState({
    name: '', code: '', address: '', city: '', country: '', currency: 'USD', is_active: true,
  })

  const resetForm = () => {
    setForm({ name: '', code: '', address: '', city: '', country: '', currency: 'USD', is_active: true })
  }

  const createMutation = useMutation({
    mutationFn: () => companiesApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      setShowCreate(false)
      resetForm()
      toast.success('Company created')
    },
    onError: () => toast.error('Failed to create company'),
  })

  const updateMutation = useMutation({
    mutationFn: () => companiesApi.update(editCompany!.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      setEditCompany(null)
      resetForm()
      toast.success('Company updated')
    },
    onError: () => toast.error('Failed to update company'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => companiesApi.update(deleteCompany!.id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      setDeleteCompany(null)
      toast.success('Company deactivated')
    },
    onError: () => toast.error('Failed to deactivate company'),
  })

  const openEdit = (c: Company) => {
    setEditCompany(c)
    setForm({ name: c.name, code: c.code, address: c.address || '', city: c.city || '', country: c.country || '', currency: c.currency, is_active: c.is_active })
  }

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
    {
      key: 'actions', header: '',
      render: (c: Company) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button disabled={readOnly} onClick={() => openEdit(c)} className="text-xs text-blue-600 hover:underline">Edit</button>
          <button disabled={readOnly} onClick={() => setDeleteCompany(c)} className="text-xs text-red-600 hover:underline">Deactivate</button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Companies</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Multi-company support - manage separate ledgers</p>
        </div>
        <Button disabled={readOnly} onClick={() => { resetForm(); setShowCreate(true) }}>Add Company</Button>
      </div>

      <Card>
        <Table columns={columns} data={companies || []} loading={isLoading} emptyMessage="No companies configured." />
      </Card>

      <Modal isOpen={showCreate || !!editCompany} onClose={() => { setShowCreate(false); setEditCompany(null); resetForm() }} title={editCompany ? 'Edit Company' : 'Add Company'} size="md">
        <form onSubmit={(e) => { e.preventDefault(); if (readOnly) return; editCompany ? updateMutation.mutate() : createMutation.mutate() }} className="space-y-4">
          <Input label="Company Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g., ACME" required />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
          <Input label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="USD" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowCreate(false); setEditCompany(null); resetForm() }}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>{editCompany ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteCompany}
        onClose={() => setDeleteCompany(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Deactivate Company"
        message={`Deactivate ${deleteCompany?.name}? It will be marked inactive.`}
        confirmLabel="Deactivate"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
