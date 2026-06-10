import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { dashboardApi, adminApi } from '../../lib/api'
import { getCurrentCompanyId } from '../../lib/company'
import { useEffect, useState } from 'react'

export function AdminDashboardPage() {
  const [companyId, setCompanyId] = useState('')

  useEffect(() => {
    getCurrentCompanyId().then(setCompanyId)
  }, [])

  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard', companyId],
    queryFn: () => dashboardApi.getStats(companyId),
    enabled: !!companyId,
  })

  const { data: adminStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getSystemStats(),
    enabled: true,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Administrator Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">System oversight, user & compliance controls</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">U</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{adminStats?.total_users ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">A</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Users</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{adminStats?.active_users ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">F</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Failed Imports</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{adminStats?.failed_imports ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">H</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">System Health</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100"><Badge variant="info">OK</Badge></p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Live KPIs" subtitle="Based on current company activity">
        <div className="flex flex-wrap gap-3">
          <Badge variant="info">Total Reconciliations: {stats?.completed_reconciliations ?? 0}</Badge>
          <Badge variant="success">Matched Tx: {stats?.total_matched ?? 0}</Badge>
          <Badge variant="warning">Unmatched Tx: {stats?.total_unmatched ?? 0}</Badge>
          <Badge variant="danger">Error Rate: {stats?.error_rate ?? 0}%</Badge>
        </div>
      </Card>

      <Card title="Quick Actions">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          <Link to="/users" className="flex items-center justify-center p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium">
            Manage Users
          </Link>
          <Link to="/roles" className="flex items-center justify-center p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium">
            Roles & Permissions
          </Link>
          <Link to="/settings" className="flex items-center justify-center p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium">
            System Settings
          </Link>
        </div>
      </Card>
    </div>
  )
}
