import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReadOnly } from '../../components/rbac/ReadOnlyGuard'
import { rulesApi } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { getCurrentCompanyId } from '../../lib/company'
import toast from 'react-hot-toast'
import type { ReconciliationRule } from '../../types'

const ruleTypeLabels: Record<string, string> = {
  amount_exact: 'Exact Amount',
  amount_range: 'Amount Range',
  date_exact: 'Exact Date',
  date_range: 'Date Range',
  reference_number: 'Reference Number',
  transaction_id: 'Transaction ID',
  description: 'Description Match',
  customer_id: 'Customer ID',
  custom: 'Custom Rule',
}

export function RulesPage() {
  const queryClient = useQueryClient()
  const [companyId, setCompanyId] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingRule, setEditingRule] = useState<ReconciliationRule | null>(null)
  const readOnly = useReadOnly()

  useEffect(() => {
    getCurrentCompanyId().then(setCompanyId)
  }, [])

  const { data: rules, isLoading } = useQuery({
    queryKey: ['rules', companyId],
    queryFn: () => rulesApi.list(companyId),
    enabled: !!companyId,
  })

  const [form, setForm] = useState({
    name: '', description: '', rule_type: 'amount_exact' as ReconciliationRule['rule_type'],
    match_priority: '1', is_active: true,
  })

  const createMutation = useMutation({
    mutationFn: () => rulesApi.create({
      company_id: companyId,
      name: form.name,
      description: form.description,
      rule_type: form.rule_type,
      match_priority: parseInt(form.match_priority),
      config: {},
      is_active: form.is_active,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] })
      setShowCreate(false)
      resetForm()
      toast.success('Rule created')
    },
    onError: () => toast.error('Failed to create rule'),
  })

  const updateMutation = useMutation({
    mutationFn: () => rulesApi.update(editingRule!.id, {
      name: form.name,
      description: form.description,
      rule_type: form.rule_type,
      match_priority: parseInt(form.match_priority),
      is_active: form.is_active,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] })
      setEditingRule(null)
      resetForm()
      toast.success('Rule updated')
    },
    onError: () => toast.error('Failed to update rule'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rulesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] })
      toast.success('Rule deleted')
    },
  })

  const resetForm = () => {
    setForm({ name: '', description: '', rule_type: 'amount_exact', match_priority: '1', is_active: true })
  }

  const openEdit = (rule: ReconciliationRule) => {
    setEditingRule(rule)
    setForm({
      name: rule.name, description: rule.description || '', rule_type: rule.rule_type,
      match_priority: rule.match_priority.toString(), is_active: rule.is_active,
    })
  }

  const columns = [
    { key: 'name', header: 'Rule Name' },
    {
      key: 'rule_type', header: 'Type',
      render: (r: ReconciliationRule) => <Badge>{ruleTypeLabels[r.rule_type] || r.rule_type}</Badge>,
    },
    { key: 'match_priority', header: 'Priority' },
    {
      key: 'is_active', header: 'Status',
      render: (r: ReconciliationRule) => <Badge variant={r.is_active ? 'success' : 'default'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions', header: 'Actions',
      render: (r: ReconciliationRule) => (
        readOnly ? (
          <span className="text-sm text-gray-500">Read-only</span>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(r) }}>Edit</Button>
            <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(r.id) }} loading={deleteMutation.isPending}>Delete</Button>
          </div>
        )
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Rules Engine</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Configure automated matching rules for reconciliation</p>
        </div>
        <Button disabled={readOnly} onClick={() => { resetForm(); setShowCreate(true) }}>Create Rule</Button>
      </div>

      <Card>
        <Table columns={columns} data={rules || []} loading={isLoading} emptyMessage="No rules configured. Create your first matching rule." />
      </Card>

      <Modal isOpen={showCreate || !!editingRule} onClose={() => { setShowCreate(false); setEditingRule(null); resetForm() }} title={editingRule ? 'Edit Rule' : 'Create Rule'} size="md">
        <form onSubmit={(e) => { e.preventDefault(); if (readOnly) return; editingRule ? updateMutation.mutate() : createMutation.mutate() }} className="space-y-4">
          <Input label="Rule Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Exact Amount Match" required />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe what this rule does" />
          <Select
            label="Rule Type"
            options={Object.entries(ruleTypeLabels).map(([value, label]) => ({ value, label }))}
            value={form.rule_type}
            onChange={(e) => setForm({ ...form, rule_type: e.target.value as ReconciliationRule['rule_type'] })}
          />
          <Input label="Match Priority" type="number" min="1" value={form.match_priority} onChange={(e) => setForm({ ...form, match_priority: e.target.value })} />
          <Select
            label="Status"
            options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]}
            value={form.is_active ? 'true' : 'false'}
            onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowCreate(false); setEditingRule(null); resetForm() }}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>{editingRule ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
