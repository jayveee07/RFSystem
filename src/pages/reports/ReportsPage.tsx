import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReadOnly } from '../../components/rbac/ReadOnlyGuard'
import { reportsApi } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { getCurrentCompanyId } from '../../lib/company'
import toast from 'react-hot-toast'
import type { Report, User } from '../../types'

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  completed: 'success',
  generating: 'info',
  pending: 'warning',
  failed: 'danger',
}

const reportTypeLabels: Record<string, string> = {
  daily_reconciliation: 'Daily Reconciliation',
  monthly_reconciliation: 'Monthly Reconciliation',
  bank_reconciliation: 'Bank Reconciliation',
  exception_report: 'Exception Report',
  audit_report: 'Audit Report',
  custom: 'Custom Report',
}

export function ReportsPage() {
  const queryClient = useQueryClient()
  const [companyId, setCompanyId] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const readOnly = useReadOnly()

  useEffect(() => {
    getCurrentCompanyId().then(setCompanyId)
  }, [])

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports', companyId],
    queryFn: () => reportsApi.list(companyId),
    enabled: !!companyId,
  })

  const [form, setForm] = useState({ name: '', type: 'daily_reconciliation', format: 'pdf' as Report['format'] })

  const createMutation = useMutation({
    mutationFn: () => reportsApi.create({
      company_id: companyId,
      name: form.name,
      type: form.type as Report['type'],
      format: form.format,
      status: 'pending',
      parameters: {},
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setShowCreate(false)
      setForm({ name: '', type: 'daily_reconciliation', format: 'pdf' })
      toast.success('Report scheduled')
    },
    onError: () => toast.error('Failed to create report'),
  })

  const columns = [
    { key: 'name', header: 'Report Name' },
    {
      key: 'type', header: 'Type',
      render: (r: Report) => <Badge>{reportTypeLabels[r.type] || r.type}</Badge>,
    },
    { key: 'format', header: 'Format', render: (r: Report) => <Badge>{r.format.toUpperCase()}</Badge> },
    {
      key: 'status', header: 'Status',
      render: (r: Report) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge>,
    },
    {
      key: 'created_by', header: 'Created By',
      render: (r: Report & { users?: User }) => r.users?.full_name || '-',
    },
    {
      key: 'created_at', header: 'Created',
      render: (r: Report) => new Date(r.created_at).toLocaleDateString(),
    },
    {
      key: 'actions', header: 'Actions',
      render: (r: Report) => (
        r.status === 'completed' && r.file_url ? (
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); window.open(r.file_url, '_blank') }}>Download</Button>
        ) : <span className="text-gray-400 text-sm">-</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Generate and schedule reconciliation reports</p>
        </div>
        <Button disabled={readOnly} onClick={() => setShowCreate(true)}>Generate Report</Button>
      </div>

      <Card>
        <Table columns={columns} data={reports || []} loading={isLoading} emptyMessage="No reports generated yet." />
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Generate Report" size="md">
        <form onSubmit={(e) => { e.preventDefault(); if (readOnly) return; createMutation.mutate() }} className="space-y-4">
          <Input label="Report Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Monthly Reconciliation Report" required />
          <Select
            label="Report Type"
            options={Object.entries(reportTypeLabels).map(([value, label]) => ({ value, label }))}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          />
          <Select
            label="Format"
            options={[
              { value: 'pdf', label: 'PDF' },
              { value: 'csv', label: 'CSV' },
              { value: 'xlsx', label: 'Excel (XLSX)' },
            ]}
            value={form.format}
            onChange={(e) => setForm({ ...form, format: e.target.value as Report['format'] })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Generate</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
