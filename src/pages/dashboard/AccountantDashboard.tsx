import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { getCurrentCompanyId } from '../../lib/company'
import type { DashboardStats } from '../../types'

export function AccountantDashboard() {
  const [companyId, setCompanyId] = useState('')

  useEffect(() => {
    getCurrentCompanyId().then(setCompanyId)
  }, [])

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['accountant-dashboard', companyId],
    queryFn: () => dashboardApi.getStats(companyId),
    enabled: !!companyId,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Accountant Dashboard</h1>
        <p className="text-gray-500 mt-1">Track reconciliation status, transaction quality, and exception resolution.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Pending Reconciliations">
          <div className="text-3xl font-bold text-orange-600">{stats?.pending_reconciliations ?? 0}</div>
          <p className="text-sm text-gray-500 mt-1">Items waiting for matching and review</p>
        </Card>
        <Card title="Open Exceptions">
          <div className="text-3xl font-bold text-red-600">{stats?.total_unmatched ?? 0}</div>
          <p className="text-sm text-gray-500 mt-1">Discrepancies that need attention</p>
        </Card>
        <Card title="Matched Transactions">
          <div className="text-3xl font-bold text-green-600">{stats?.total_matched ?? 0}</div>
          <p className="text-sm text-gray-500 mt-1">Transactions already reconciled</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Progress">
          {isLoading ? (
            <p className="text-gray-500">Loading reconciliation summary...</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Completion Rate</span>
                <Badge variant="success">{stats ? `${Math.round((stats.total_matched / Math.max(stats.total_transactions, 1)) * 100)}%` : '0%'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Exception Exposure</span>
                <Badge variant="warning">{stats ? `${Math.round((stats.total_unmatched / Math.max(stats.total_transactions, 1)) * 100)}%` : '0%'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Pending Approvals</span>
                <Badge variant="info">{stats?.pending_reconciliations ?? 0}</Badge>
              </div>
            </div>
          )}
        </Card>

        <Card title="Cash Visibility">
          <div className="text-3xl font-bold text-indigo-600">${stats?.bank_balances?.toLocaleString() ?? 0}</div>
          <p className="text-sm text-gray-500 mt-1">Total available balance across accounts</p>
        </Card>
      </div>
    </div>
  )
}
