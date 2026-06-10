import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi, reportsApi } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { getCurrentCompanyId } from '../../lib/company'
import type { DashboardStats, Report } from '../../types'

export function ViewerDashboard() {
  const [companyId, setCompanyId] = useState('')

  useEffect(() => {
    getCurrentCompanyId().then(setCompanyId)
  }, [])

  const { data: stats, isLoading: loadingStats } = useQuery<DashboardStats>({
    queryKey: ['viewer-dashboard', companyId],
    queryFn: () => dashboardApi.getStats(companyId),
    enabled: !!companyId,
  })

  const { data: reports, isLoading: loadingReports } = useQuery<Report[]>({
    queryKey: ['viewer-reports', companyId],
    queryFn: () => reportsApi.list(companyId),
    enabled: !!companyId,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Viewer Dashboard</h1>
        <p className="text-gray-500 mt-1">Read-only access to dashboards, reconciliations, and reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Total Transactions">
          <div className="text-3xl font-bold text-blue-600">{stats?.total_transactions ?? 0}</div>
        </Card>
        <Card title="Matched Rate">
          <div className="text-3xl font-bold text-green-600">{stats ? `${Math.round((stats.total_matched / Math.max(stats.total_transactions, 1)) * 100)}%` : '0%'}</div>
        </Card>
        <Card title="Active Exceptions">
          <div className="text-3xl font-bold text-red-600">{stats?.total_unmatched ?? 0}</div>
        </Card>
      </div>

      <Card title="Latest Reports">
        {loadingReports ? (
          <p className="text-gray-500">Loading recent reports...</p>
        ) : reports?.length ? (
          <div className="space-y-3">
            {reports.slice(0, 5).map((report) => (
              <div key={report.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{report.name}</p>
                  <p className="text-xs text-gray-500">{report.format.toUpperCase()} • {report.status}</p>
                </div>
                <Badge variant={report.status === 'completed' ? 'success' : report.status === 'failed' ? 'danger' : 'warning'}>{report.status}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No recent reports available.</p>
        )}
      </Card>
    </div>
  )
}
