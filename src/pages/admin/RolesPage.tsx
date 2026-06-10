import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReadOnly } from '../../components/rbac/ReadOnlyGuard'
import { rolesApi } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Table } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import toast from 'react-hot-toast'
import type { Role } from '../../types'

export function RolesPage() {
  const queryClient = useQueryClient()
  const readOnly = useReadOnly()
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })

  const { data: roles, isLoading } = useQuery({ queryKey: ['roles'], queryFn: () => rolesApi.list() })

  const createMutation = useMutation({
    mutationFn: () => rolesApi.create({ name: form.name.trim(), description: form.description.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setShowCreate(false)
      setForm({ name: '', description: '' })
      toast.success('Role created')
    },
    onError: () => toast.error('Failed to create role'),
  })

  const editMutation = useMutation({
    mutationFn: () => selectedRole ? rolesApi.update(selectedRole.id, { name: form.name.trim(), description: form.description.trim() }) : Promise.reject(new Error('No role selected')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setShowEdit(false)
      setSelectedRole(null)
      setForm({ name: '', description: '' })
      toast.success('Role updated')
    },
    onError: () => toast.error('Failed to update role'),
  })

  const handleRowClick = (role: Role) => {
    setSelectedRole(role)
    setForm({ name: role.name, description: role.description || '' })
    setShowEdit(true)
  }

  const columns = [
    { key: 'name', header: 'Role' },
    { key: 'description', header: 'Description' },
    {
      key: 'is_system', header: 'Type',
      render: (item: Role) => item.is_system ? 'System' : 'Custom',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Roles</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage role definitions and descriptions for access control.</p>
        </div>
        <Button disabled={readOnly} onClick={() => setShowCreate(true)}>Add Role</Button>
      </div>

      <Card>
        <p className="text-sm text-gray-500 mb-4">Select a role row to edit the name or description.</p>
        <Table columns={columns} data={roles || []} loading={isLoading} onRowClick={handleRowClick} emptyMessage="No roles defined." />
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Role" size="md">
        <form onSubmit={(e) => { e.preventDefault(); if (!readOnly) createMutation.mutate() }} className="space-y-4">
          <Input label="Role Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Role" size="md">
        <form onSubmit={(e) => { e.preventDefault(); if (!readOnly) editMutation.mutate() }} className="space-y-4">
          <Input label="Role Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
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
