import { useQuery } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { dashboardApi } from '../../lib/api'
import { getCurrentCompanyId } from '../../lib/company'
import { useEffect, useState } from 'react'

export function FinanceManagerDashboard() {
  const [companyId, setCompanyId] = useState('')
  useEffect(() => { getCurrentCompanyId().then(setCompanyId) }, [])

  const { data: stats } = useQuery({
    queryKey: ['fm-dashboard', companyId],
    queryFn: () => dashboardApi.getStats(companyId),
    enabled: !!companyId,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Finance Overview</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Reconciliation oversight and approvals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Pending Approvals">
          <div className="text-3xl font-bold text-orange-600">{stats?.pending_reconciliations ?? 0}</div>
          <p className="text-xs text-gray-500 mt-1">Requires your review</p>
        </Card>
        <Card title="Completed This Month">
          <div className="text-3xl font-bold text-green-600">{stats?.completed_reconciliations ?? 0}</div>
        </Card>
        <Card title="Active Exceptions">
          <div className="text-3xl font-bold text-red-600">{stats?.total_unmatched ?? 0}</div>
        </Card>
      </div>

      <Card title="Company Liquidity">
        <div className="text-2xl font-mono">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats?.bank_balances ?? 0)}
        </div>
      </Card>

      <Card title="Recent Activity">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {stats?.recent_activities?.map((activity) => (
            <div key={activity.id} className="py-3 text-sm">
              <span className="font-medium text-gray-900 dark:text-gray-100">{activity.action}</span>
              <span className="ml-2 text-gray-500">{new Date(activity.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}