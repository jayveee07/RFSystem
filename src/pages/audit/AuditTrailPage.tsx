import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { auditLogsApi } from '../../lib/api'
import { getCurrentCompanyId } from '../../lib/company'
import { Input } from '../../components/ui/Input' // Assuming an Input component exists
import { Button } from '../../components/ui/Button' // Assuming a Button component exists

export function AuditTrailPage() {
  const [companyId, setCompanyId] = useState('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')

  useEffect(() => { getCurrentCompanyId().then(setCompanyId) }, [])

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['audit-logs', companyId, startDate, endDate],
    queryFn: () => auditLogsApi.list({ companyId, startDate, endDate }),
    enabled: !!companyId,
  })

  const filteredLogs = auditLogs?.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_id.toLowerCase().includes(searchTerm.toLowerCase()) // Assuming user_id is enough for search
  )

  const handleExport = () => {
    if (!filteredLogs?.length) return

    const header = ['Timestamp', 'User', 'Action', 'Details', 'IP Address', 'User Agent']
    const rows = filteredLogs.map((log) => [
      new Date(log.created_at).toLocaleString(),
      log.user_id,
      log.action,
      typeof log.details === 'string' ? log.details : JSON.stringify(log.details || {}),
      log.ip_address || '-',
      log.user_agent || '-',
    ])

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Audit Trail</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Track all system activities and changes.</p>
      </div>

      <Card title="Filter & Search">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            type="date"
            label="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            type="date"
            label="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Input
            type="text"
            label="Search Action/User"
            placeholder="e.g., 'created user', 'john.doe'"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleExport} disabled={!filteredLogs?.length}>Export to CSV</Button>
        </div>
      </Card>

      <Card title="Activity Log">
        {isLoading ? (
          <p>Loading audit logs...</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">User</th>
                <th className="pb-3">Action</th>
                <th className="pb-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredLogs?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-500">No audit logs found for the selected criteria.</td>
                </tr>
              ) : (
                filteredLogs?.map((log) => (
                  <tr key={log.id} className="text-sm">
                    <td className="py-3 text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="py-3 dark:text-gray-300">{log.user_id}</td>
                    <td className="py-3 dark:text-gray-100 font-medium">{log.action}</td>
                    <td className="py-3 text-gray-500">{typeof log.details === 'string' ? log.details : log.details ? JSON.stringify(log.details) : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}