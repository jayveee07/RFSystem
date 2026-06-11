import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { getCurrentCompanyId } from '../../lib/company'
import { securityApi } from '../../lib/api'

export function SecurityCenterPage() {
  const [companyId, setCompanyId] = useState('')

  useEffect(() => {
    getCurrentCompanyId().then(setCompanyId)
  }, [])

  const { data: stats, isLoading } = useQuery({
    queryKey: ['security-stats', companyId],
    queryFn: () => securityApi.getSecurityStats(companyId),
    enabled: !!companyId,
  })

  const { data: loginAttempts } = useQuery({
    queryKey: ['login-attempts', companyId],
    queryFn: () => securityApi.getLoginAttempts(companyId, { limitCount: 10 }),
    enabled: !!companyId,
  })

  const kpis = [
    { label: 'Total Users', value: stats?.total_users ?? '-', color: 'text-blue-600' },
    { label: 'MFA Enabled', value: stats?.mfa_enabled_users ?? '-', color: 'text-green-600' },
    { label: 'Active Sessions', value: stats?.active_sessions ?? '-', color: 'text-indigo-600' },
    { label: 'Security Alerts', value: stats?.security_alerts ?? '-', color: stats?.security_alerts && stats.security_alerts > 0 ? 'text-red-600' : 'text-green-600' },
  ]

  const loginColumns = [
    { key: 'email', header: 'Email' },
    { key: 'ip_address', header: 'IP Address' },
    {
      key: 'status', header: 'Status',
      render: (r: any) => <Badge variant={r.status === 'success' ? 'success' : 'danger'}>{r.status}</Badge>,
    },
    {
      key: 'timestamp', header: 'Time',
      render: (r: any) => new Date(r.timestamp).toLocaleString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Security Center</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor security status, user access, and login activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">{kpi.label}</p>
              <p className={`text-3xl font-bold mt-1 ${kpi.color}`}>
                {isLoading ? <span className="animate-pulse">...</span> : kpi.value}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Card title="Recent Login Attempts">
        <Table columns={loginColumns} data={loginAttempts || []} loading={isLoading} emptyMessage="No login attempts recorded." />
      </Card>
    </div>
  )
}
