import { useQuery } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { auditLogsApi } from '../../lib/api'
import { getCurrentCompanyId } from '../../lib/company'
import { useEffect, useState } from 'react'

export function AuditorDashboard() {
  const [companyId, setCompanyId] = useState('')
  useEffect(() => { getCurrentCompanyId().then(setCompanyId) }, [])

  const { data: logs } = useQuery({
    queryKey: ['audit-summary', companyId],
    queryFn: () => auditLogsApi.list({ companyId, limitCount: 10 }),
    enabled: !!companyId,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Compliance & Audit</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">System-wide integrity logs</p>
      </div>

      <Card title="System Integrity Log">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="pb-3">Timestamp</th>
              <th className="pb-3">User</th>
              <th className="pb-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {logs?.map((log) => (
              <tr key={log.id} className="text-sm">
                <td className="py-3 text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                <td className="py-3 dark:text-gray-300">{log.user_id}</td>
                <td className="py-3 dark:text-gray-100 font-medium">{log.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}