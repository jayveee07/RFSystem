import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReadOnly } from '../../components/rbac/ReadOnlyGuard'
import { permissionsApi } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Table } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import toast from 'react-hot-toast'
import type { Permission } from '../../types'

export function PermissionsPage() {
  const queryClient = useQueryClient()
  const readOnly = useReadOnly()
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null)
  const [form, setForm] = useState({ code: '', name: '', module: '', description: '' })

  const { data: permissions, isLoading } = useQuery({ queryKey: ['permissions'], queryFn: () => permissionsApi.list() })

  const createMutation = useMutation({
    mutationFn: () => permissionsApi.create({
      code: form.code.trim(),
      name: form.name.trim(),
      module: form.module.trim(),
      description: form.description.trim(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      setShowCreate(false)
      setForm({ code: '', name: '', module: '', description: '' })
      toast.success('Permission created')
    },
    onError: () => toast.error('Failed to create permission'),
  })

  const editMutation = useMutation({
    mutationFn: () => selectedPermission ? permissionsApi.update(selectedPermission.id, {
      code: form.code.trim(),
      name: form.name.trim(),
      module: form.module.trim(),
      description: form.description.trim(),
    }) : Promise.reject(new Error('No permission selected')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      setShowEdit(false)
      setSelectedPermission(null)
      setForm({ code: '', name: '', module: '', description: '' })
      toast.success('Permission updated')
    },
    onError: () => toast.error('Failed to update permission'),
  })

  const handleRowClick = (permission: Permission) => {
    setSelectedPermission(permission)
    setForm({
      code: permission.code,
      name: permission.name,
      module: permission.module,
      description: permission.description || '',
    })
    setShowEdit(true)
  }

  const columns = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Name' },
    { key: 'module', header: 'Module' },
    { key: 'description', header: 'Description' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Permissions</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage granular access scopes for application features.</p>
        </div>
        <Button disabled={readOnly} onClick={() => setShowCreate(true)}>Add Permission</Button>
      </div>

      <Card>
        <p className="text-sm text-gray-500 mb-4">Click a permission row to update it.</p>
        <Table columns={columns} data={permissions || []} loading={isLoading} onRowClick={handleRowClick} emptyMessage="No permissions configured." />
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Permission" size="md">
        <form onSubmit={(e) => { e.preventDefault(); if (!readOnly) createMutation.mutate() }} className="space-y-4">
          <Input label="Permission Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="users.view" />
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Module" value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} required placeholder="User Management" />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Permission" size="md">
        <form onSubmit={(e) => { e.preventDefault(); if (!readOnly) editMutation.mutate() }} className="space-y-4">
          <Input label="Permission Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Module" value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} required />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" loading={editMutation.isPending}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
