import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReadOnly } from '../../components/rbac/ReadOnlyGuard'
import { reconciliationsApi, matchesApi } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { getCurrentCompanyId } from '../../lib/company'
import toast from 'react-hot-toast'
import type { Reconciliation, BankAccount, BankStatement } from '../../types'

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  completed: 'success',
  approved: 'success',
  pending_approval: 'warning',
  draft: 'default',
  rejected: 'danger',
}

export function ReconciliationPage() {
  const queryClient = useQueryClient()
  const [companyId, setCompanyId] = useState('')
  const [selectedRec, setSelectedRec] = useState<Reconciliation | null>(null)
  const readOnly = useReadOnly()

  useEffect(() => {
    getCurrentCompanyId().then(setCompanyId)
  }, [])

  const { data: reconciliations, isLoading } = useQuery({
    queryKey: ['reconciliations', companyId],
    queryFn: () => reconciliationsApi.list(companyId),
    enabled: !!companyId,
  })

  const { data: matches } = useQuery({
    queryKey: ['matches', selectedRec?.id],
    queryFn: () => matchesApi.list(selectedRec?.id),
    enabled: !!selectedRec,
  })

  const pendingCount = reconciliations?.filter((r) => r.status === 'pending_approval').length ?? 0
  const draftCount = reconciliations?.filter((r) => r.status === 'draft').length ?? 0
  const approvedCount = reconciliations?.filter((r) => r.status === 'approved').length ?? 0
  const canApprove = !!selectedRec && selectedRec.status === 'pending_approval' && !readOnly

  const approveMutation = useMutation({
    mutationFn: (id: string) => reconciliationsApi.update(id, { status: 'approved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] })
      toast.success('Reconciliation approved')
    },
  })

  const columns = [
    {
      key: 'reconciliation_date', header: 'Date',
      render: (r: Reconciliation) => new Date(r.reconciliation_date).toLocaleDateString(),
    },
    {
      key: 'bank_account', header: 'Account',
      render: (r: Reconciliation & { bank_accounts?: BankAccount }) => r.bank_accounts?.account_name || '-',
    },
    {
      key: 'total_matched', header: 'Matched',
      render: (r: Reconciliation) => <span className="text-green-600 font-medium">${r.total_matched.toLocaleString()}</span>,
    },
    {
      key: 'total_unmatched', header: 'Unmatched',
      render: (r: Reconciliation) => <span className="text-yellow-600 font-medium">${r.total_unmatched.toLocaleString()}</span>,
    },
    {
      key: 'difference', header: 'Difference',
      render: (r: Reconciliation) => (
        <span className={`font-medium ${r.difference === 0 ? 'text-green-600' : 'text-red-600'}`}>
          ${r.difference.toLocaleString()}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (r: Reconciliation) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge> },
  ]

  const matchColumns = [
    { key: 'match_type', header: 'Match Type' },
    { key: 'match_status', header: 'Status', render: (m: { match_status: string }) => <Badge variant={m.match_status === 'confirmed' ? 'success' : m.match_status === 'rejected' ? 'danger' : 'warning'}>{m.match_status}</Badge> },
    { key: 'confidence_score', header: 'Confidence', render: (m: { confidence_score?: number }) => m.confidence_score ? `${m.confidence_score}%` : '-' },
    { key: 'matched_at', header: 'Matched At', render: (m: { matched_at: string }) => new Date(m.matched_at).toLocaleString() },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bank Reconciliation</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Reconcile bank statements against ledger transactions</p>
      </div>

      <Card title="Reconciliation Queue" subtitle="Track reconciliation batches and approval readiness">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">Drafts</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-100">{draftCount}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
            <p className="mt-2 text-3xl font-semibold text-yellow-600">{pendingCount}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
            <p className="mt-2 text-3xl font-semibold text-green-600">{approvedCount}</p>
          </div>
        </div>
      </Card>

      <Card title="Reconciliations" subtitle="Match bank statements with transactions">
        <Table columns={columns} data={reconciliations || []} loading={isLoading} emptyMessage="No reconciliations yet." onRowClick={(r) => setSelectedRec(r)} />
      </Card>

      {selectedRec && (
        <Card
          title={`Matches for Reconciliation`}
          subtitle={`Status: ${selectedRec.status}`}
          action={
            selectedRec.status === 'pending_approval' && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button onClick={() => approveMutation.mutate(selectedRec.id)} loading={approveMutation.isPending} disabled={!canApprove}>Approve</Button>
                {readOnly && <span className="text-sm text-gray-500">Read-only viewers cannot approve reconciliations.</span>}
              </div>
            )
          }
        >
          <Table columns={matchColumns} data={matches || []} emptyMessage="No matches yet." />
        </Card>
      )}
    </div>
  )
}
