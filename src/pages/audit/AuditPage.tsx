import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditLogsApi } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { getCurrentCompanyId } from '../../lib/company'
import type { AuditLog } from '../../types'

export function AuditPage() {
  const [companyId, setCompanyId] = useState('')

  useEffect(() => {
    getCurrentCompanyId().then(setCompanyId)
  }, [])

  const { data: logs, isLoading } = useQuery({
    queryKey: ['auditLogs', companyId],
    queryFn: () => auditLogsApi.list({ companyId }),
    enabled: !!companyId,
    refetchInterval: 15000,
  })

  const columns = [
    {
      key: 'created_at', header: 'Timestamp',
      render: (l: AuditLog) => new Date(l.created_at).toLocaleString(),
    },
    {
      key: 'user', header: 'User',
      render: (l: AuditLog & { users?: { full_name: string; email: string } }) => l.users?.full_name || l.users?.email || '-',
    },
    { key: 'action', header: 'Action' },
    { key: 'entity_type', header: 'Entity', render: (l: AuditLog) => <Badge>{l.entity_type}</Badge> },
    {
      key: 'details', header: 'Details',
      render: (l: AuditLog) => l.details ? JSON.stringify(l.details).slice(0, 60) + '...' : '-',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
        <p className="text-gray-500 mt-1">Full activity log of all system actions</p>
      </div>

      <Card>
        <Table columns={columns} data={logs || []} loading={isLoading} emptyMessage="No audit logs yet." />
      </Card>
    </div>
  )
}
