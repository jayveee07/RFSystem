import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReadOnly } from '../../components/rbac/ReadOnlyGuard'
import { usersApi } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Table } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import toast from 'react-hot-toast'
import type { User } from '../../types'

const statusOptions = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

export function UsersPage() {
  const queryClient = useQueryClient()
  const readOnly = useReadOnly()
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [createForm, setCreateForm] = useState({ uid: '', email: '', full_name: '', company_id: '', is_active: 'true' })
  const [editForm, setEditForm] = useState({ email: '', full_name: '', company_id: '', is_active: 'true' })

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: () => usersApi.create(createForm.uid.trim(), {
      email: createForm.email.trim(),
      full_name: createForm.full_name.trim(),
      company_id: createForm.company_id.trim(),
      is_active: createForm.is_active === 'true',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowCreate(false)
      setCreateForm({ uid: '', email: '', full_name: '', company_id: '', is_active: 'true' })
      toast.success('User record created')
    },
    onError: () => toast.error('Failed to create user record'),
  })

  const editMutation = useMutation({
    mutationFn: () => selectedUser ? usersApi.update(selectedUser.id, {
      email: editForm.email.trim(),
      full_name: editForm.full_name.trim(),
      company_id: editForm.company_id.trim(),
      is_active: editForm.is_active === 'true',
    }) : Promise.reject(new Error('No user selected')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowEdit(false)
      setSelectedUser(null)
      toast.success('User updated')
    },
    onError: () => toast.error('Failed to update user'),
  })

  const handleRowClick = (user: User) => {
    setSelectedUser(user)
    setEditForm({
      email: user.email,
      full_name: user.full_name,
      company_id: user.company_id ?? '',
      is_active: user.is_active ? 'true' : 'false',
    })
    setShowEdit(true)
  }

  const columns = [
    { key: 'full_name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'company_id', header: 'Company ID' },
    {
      key: 'roles', header: 'Roles',
      render: (item: User) => item.roles?.map((role) => role.name).join(', ') || '-',
    },
    {
      key: 'is_active', header: 'Status',
      render: (item: User) => item.is_active ? 'Active' : 'Inactive',
    },
    { key: 'created_at', header: 'Created' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Users</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage Firestore user records and activate or edit profiles.</p>
        </div>
        <Button disabled={readOnly} onClick={() => setShowCreate(true)}>Create User Record</Button>
      </div>

      <Card>
        <p className="text-sm text-gray-500 mb-4">Click a row to edit an existing user record.</p>
        <Table columns={columns} data={users || []} loading={isLoading} onRowClick={handleRowClick} emptyMessage="No users found." />
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create User Record" size="md">
        <form onSubmit={(e) => { e.preventDefault(); if (!readOnly) createMutation.mutate() }} className="space-y-4">
          <Input label="Firebase UID" value={createForm.uid} onChange={(e) => setCreateForm({ ...createForm, uid: e.target.value })} required />
          <Input label="Email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
          <Input label="Full Name" value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} required />
          <Input label="Company ID" value={createForm.company_id} onChange={(e) => setCreateForm({ ...createForm, company_id: e.target.value })} />
          <Select label="Status" value={createForm.is_active} onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.value })} options={statusOptions} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit User" size="md">
        <form onSubmit={(e) => { e.preventDefault(); if (!readOnly) editMutation.mutate() }} className="space-y-4">
          <Input label="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
          <Input label="Full Name" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} required />
          <Input label="Company ID" value={editForm.company_id} onChange={(e) => setEditForm({ ...editForm, company_id: e.target.value })} />
          <Select label="Status" value={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value })} options={statusOptions} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" loading={editMutation.isPending}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
