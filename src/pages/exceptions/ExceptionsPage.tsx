import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReadOnly } from '../../components/rbac/ReadOnlyGuard'
import { exceptionsApi } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { getCurrentCompanyId } from '../../lib/company'
import toast from 'react-hot-toast'
import type { Exception, User } from '../../types'

const severityVariant: Record<string, 'danger' | 'warning' | 'info' | 'default'> = {
  critical: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'info',
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  resolved: 'success',
  closed: 'default',
  in_progress: 'info',
  open: 'warning',
  escalated: 'danger',
}

export function ExceptionsPage() {
  const queryClient = useQueryClient()
  const [companyId, setCompanyId] = useState('')
  const [selectedException, setSelectedException] = useState<Exception | null>(null)
  const [showResolve, setShowResolve] = useState(false)
  const [resolution, setResolution] = useState({ status: 'resolved' as Exception['status'], notes: '', assigned_to: '' })
  const [commentDraft, setCommentDraft] = useState('')
  const [comments, setComments] = useState<string[]>([])
  const readOnly = useReadOnly()

  useEffect(() => {
    getCurrentCompanyId().then(setCompanyId)
  }, [])

  const { data: exceptions, isLoading } = useQuery({
    queryKey: ['exceptions', companyId],
    queryFn: () => exceptionsApi.list({ companyId }),
    enabled: !!companyId,
  })

  const resolveMutation = useMutation({
    mutationFn: (payload: { status: Exception['status']; resolution_notes: string; assigned_to?: string }) =>
      exceptionsApi.update(selectedException!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptions'] })
      setShowResolve(false)
      setSelectedException(null)
      setResolution({ status: 'resolved', notes: '', assigned_to: '' })
      setComments([])
      setCommentDraft('')
      toast.success('Exception updated')
    },
    onError: () => toast.error('Failed to update exception'),
  })

  const addComment = async () => {
    if (!commentDraft.trim() || !selectedException) return
    try {
      await exceptionsApi.addComment(selectedException.id, '', commentDraft.trim())
      setComments((prev) => [commentDraft.trim(), ...prev])
      setCommentDraft('')
      toast.success('Comment added')
    } catch {
      toast.error('Failed to add comment')
    }
  }

  const columns = [
    {
      key: 'exception_type', header: 'Type',
      render: (e: Exception) => <Badge variant={severityVariant[e.severity]}>{e.exception_type.replace(/_/g, ' ')}</Badge>,
    },
    { key: 'description', header: 'Description' },
    {
      key: 'expected_amount', header: 'Expected',
      render: (e: Exception) => e.expected_amount ? `$${e.expected_amount.toLocaleString()}` : '-',
    },
    {
      key: 'actual_amount', header: 'Actual',
      render: (e: Exception) => e.actual_amount ? `$${e.actual_amount.toLocaleString()}` : '-',
    },
    { key: 'severity', header: 'Severity', render: (e: Exception) => <Badge variant={severityVariant[e.severity]}>{e.severity}</Badge> },
    { key: 'status', header: 'Status', render: (e: Exception) => <Badge variant={statusVariant[e.status]}>{e.status}</Badge> },
    {
      key: 'assigned_to', header: 'Assigned To',
      render: (e: Exception & { users?: User }) => e.users?.full_name || 'Unassigned',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Exception Management</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Track and resolve reconciliation discrepancies</p>
      </div>

      <Card>
        <Table
          columns={columns}
          data={exceptions || []}
          loading={isLoading}
          emptyMessage="No exceptions found. All transactions are matching."
          onRowClick={(e) => {
            setSelectedException(e)
            setShowResolve(true)
            setResolution({
              status: e.status,
              notes: e.resolution_notes || '',
              assigned_to: e.assigned_to || '',
            })
            setComments([])
            setCommentDraft('')
          }}
        />
      </Card>

      <Modal isOpen={showResolve} onClose={() => { setShowResolve(false); setSelectedException(null) }} title="Resolve Exception" size="md">
        {selectedException && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
              <p><span className="font-medium text-gray-700">Type:</span> {selectedException.exception_type}</p>
              <p><span className="font-medium text-gray-700">Description:</span> {selectedException.description}</p>
              {selectedException.expected_amount && <p><span className="font-medium text-gray-700">Expected:</span> ${selectedException.expected_amount.toLocaleString()}</p>}
              {selectedException.actual_amount && <p><span className="font-medium text-gray-700">Actual:</span> ${selectedException.actual_amount.toLocaleString()}</p>}
            </div>
            <Select
              label="Resolution Status"
              options={[
                { value: 'resolved', label: 'Resolved' },
                { value: 'closed', label: 'Closed' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'escalated', label: 'Escalated' },
              ]}
              value={resolution.status}
              onChange={(e) => setResolution({ ...resolution, status: e.target.value as Exception['status'] })}
              disabled={readOnly}
            />
            <Input
              label="Assign To"
              value={resolution.assigned_to}
              onChange={(e) => setResolution({ ...resolution, assigned_to: e.target.value })}
              placeholder="User email or user ID"
              disabled={readOnly}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Notes</label>
              <textarea
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                value={resolution.notes}
                onChange={(e) => setResolution({ ...resolution, notes: e.target.value })}
                placeholder="Describe how this exception was resolved..."
                disabled={readOnly}
              />
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Internal Comments</label>
                <textarea
                  className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Add a quick note for the exception..."
                  disabled={readOnly}
                />
                <div className="mt-2 flex justify-end">
                  <Button type="button" variant="secondary" size="sm" onClick={addComment} disabled={readOnly || !commentDraft.trim()}>Add Comment</Button>
                </div>
              </div>
              <div className="space-y-2">
                {comments.length > 0 ? comments.map((comment, index) => (
                  <div key={index} className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
                    {comment}
                  </div>
                )) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No comments added yet.</p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">{readOnly ? 'Read-only viewer access. You can review exception details but cannot save changes.' : 'You can update status, assign, and resolve this exception.'}</div>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => { setShowResolve(false); setSelectedException(null) }}>Cancel</Button>
                <Button onClick={() => resolveMutation.mutate({ status: resolution.status, resolution_notes: resolution.notes, assigned_to: resolution.assigned_to })} loading={resolveMutation.isPending} disabled={readOnly}>Save Resolution</Button>
                {!readOnly && selectedException.status !== 'escalated' && (
                  <Button variant="danger" onClick={() => resolveMutation.mutate({ status: 'escalated', resolution_notes: resolution.notes, assigned_to: resolution.assigned_to })} loading={resolveMutation.isPending}>Escalate</Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
