import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi, analyticsApi } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { getCurrentCompanyId } from '../../lib/company'
import type { DashboardStats } from '../../types'

export function CFOExecutiveDashboard() {
  const [companyId, setCompanyId] = useState('')

  useEffect(() => {
    getCurrentCompanyId().then(setCompanyId)
  }, [])

  const { data: stats, isLoading: loadingStats } = useQuery<DashboardStats>({
    queryKey: ['cfo-dashboard', companyId],
    queryFn: () => dashboardApi.getStats(companyId),
    enabled: !!companyId,
  })

  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['cfo-metrics', companyId],
    queryFn: () => analyticsApi.getPerformanceMetrics(companyId),
    enabled: !!companyId,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">CFO Executive Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">High-level finance visibility for executive decision making.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Cash Balance</p>
          <p className="text-3xl font-bold text-indigo-600">${stats?.bank_balances?.toLocaleString() ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Match Rate</p>
          <p className="text-3xl font-bold text-green-600">{stats ? `${Math.round((stats.total_matched / Math.max(stats.total_transactions, 1)) * 100)}%` : '0%'}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Exception Rate</p>
          <p className="text-3xl font-bold text-red-600">{stats ? `${Math.round((stats.total_unmatched / Math.max(stats.total_transactions, 1)) * 100)}%` : '0%'}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Auto Reconciliation</p>
          <p className="text-3xl font-bold text-blue-600">{metrics?.auto_reconciliation_rate ?? 'N/A'}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Financial Trends">
          {loadingStats ? (
            <p className="text-gray-500 dark:text-gray-400">Loading trend summary...</p>
          ) : (
            <div className="space-y-2 text-sm text-gray-600">
              <p>Total transactions: {stats?.total_transactions ?? 0}</p>
              <p>Completed reconciliations: {stats?.completed_reconciliations ?? 0}</p>
              <p>Pending reviews: {stats?.pending_reconciliations ?? 0}</p>
              <p>Error rate: {stats?.error_rate ?? 0}%</p>
            </div>
          )}
        </Card>

        <Card title="Executive Summary">
          {loadingMetrics ? (
            <p className="text-gray-500 dark:text-gray-400">Loading analytics...</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Avg. Match Time</span>
                <Badge variant="info">{metrics?.average_match_time ?? 'N/A'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Manual Intervention</span>
                <Badge variant="warning">{metrics?.manual_intervention_rate ?? 'N/A'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Estimated Savings</span>
                <Badge variant="success">${metrics?.cost_savings_estimated ?? 0}</Badge>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
