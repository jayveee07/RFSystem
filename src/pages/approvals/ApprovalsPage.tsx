import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReadOnly } from '../../components/rbac/ReadOnlyGuard'
import { approvalsApi } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { getCurrentCompanyId } from '../../lib/company'
import toast from 'react-hot-toast'
import type { ApprovalRequest, User } from '../../types'

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  returned: 'info',
  cancelled: 'default',
}

export function ApprovalsPage() {
  const queryClient = useQueryClient()
  const [companyId, setCompanyId] = useState('')
  const readOnly = useReadOnly()

  useEffect(() => {
    getCurrentCompanyId().then(setCompanyId)
  }, [])

  const { data: requests, isLoading } = useQuery({
    queryKey: ['approvalRequests', companyId],
    queryFn: () => approvalsApi.listRequests(companyId),
    enabled: !!companyId,
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => approvalsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalRequests'] })
      toast.success('Request approved')
    },
    onError: () => toast.error('Failed to approve'),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => approvalsApi.reject(id, 'Rejected by reviewer'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalRequests'] })
      toast.success('Request rejected')
    },
    onError: () => toast.error('Failed to reject'),
  })

  const columns = [
    {
      key: 'entity_type', header: 'Type',
      render: (r: ApprovalRequest) => <Badge>{r.entity_type}</Badge>,
    },
    { key: 'current_step', header: 'Step', render: (r: ApprovalRequest) => `${r.current_step} of ${r.total_steps}` },
    {
      key: 'status', header: 'Status',
      render: (r: ApprovalRequest) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge>,
    },
    {
      key: 'requested_by', header: 'Requested By',
      render: (r: ApprovalRequest & { users?: User }) => r.users?.full_name || '-',
    },
    {
      key: 'requested_at', header: 'Date',
      render: (r: ApprovalRequest) => new Date(r.requested_at).toLocaleDateString(),
    },
    {
      key: 'actions', header: 'Actions',
      render: (r: ApprovalRequest) => (
        r.status === 'pending' && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); approveMutation.mutate(r.id) }} loading={approveMutation.isPending} disabled={readOnly}>Approve</Button>
            <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); rejectMutation.mutate(r.id) }} loading={rejectMutation.isPending} disabled={readOnly}>Reject</Button>
            {readOnly && <span className="text-sm text-gray-500">Read-only</span>}
          </div>
        )
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Approval Workflow</h1>
        <p className="text-gray-500 mt-1">Multi-level approval for reconciliations, exceptions, imports</p>
      </div>

      <Card>
        <Table columns={columns} data={requests || []} loading={isLoading} emptyMessage="No pending approvals." />
      </Card>
    </div>
  )
}
