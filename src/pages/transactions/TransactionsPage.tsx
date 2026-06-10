import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { transactionsApi } from '../../lib/api'
import { getCurrentCompanyId } from '../../lib/company'
import { useUserProfile } from '../../lib/profile'
import { isViewer } from '../../lib/rbac'
import { useReadOnly } from '../../components/rbac/ReadOnlyGuard'

export function TransactionsPage() {
  const [companyId, setCompanyId] = useState('')
  const [activeTab, setActiveTab] = useState<'list' | 'upload' | 'duplicates' | 'logs'>('list')

  const { user } = useUserProfile()
  const readOnly = useReadOnly()
  const isViewerUser = user ? isViewer(user) : false

  useEffect(() => {
    getCurrentCompanyId().then(setCompanyId)
  }, [])

  const { data: txData, isLoading } = useQuery({
    queryKey: ['transactions', companyId],
    queryFn: async () => {
      const result = await transactionsApi.list({ companyId })
      if (result.data.length === 0 && companyId) {
        const fallback = await transactionsApi.list({})
        return fallback
      }
      return result
    },
    enabled: !!companyId && activeTab === 'list',
  })

  const { data: duplicates } = useQuery({
    queryKey: ['tx-duplicates', companyId],
    queryFn: () => transactionsApi.detectDuplicates(companyId),
    enabled: !!companyId && activeTab === 'duplicates',
  })

  // Viewers shouldn't see upload or merge actions
  const availableTabs = readOnly ? ['list', 'duplicates', 'logs'] as const : ['list', 'upload', 'duplicates', 'logs'] as const

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Transactions</h1>
        <div className="flex gap-4 mt-4 border-b border-gray-200 dark:border-gray-800">
          {availableTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'list' && (
        <Card title="Transaction History" subtitle={companyId ? `Company filter: ${companyId}` : 'Company filter: (not resolved)'}>

          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="pb-3">Date</th>
                <th className="pb-3">Reference</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {txData?.data.map((tx) => (
                <tr key={tx.id} className="text-sm">
                  <td className="py-3">{tx.transaction_date}</td>
                  <td className="py-3 font-mono">{tx.reference_number}</td>
                  <td className="py-3">${tx.amount}</td>
                  <td className="py-3"><Badge variant={tx.status === 'reconciled' ? 'success' : 'warning'}>{tx.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === 'upload' && (
        <Card title="Import CSV/Excel">
          <div className="p-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-center">
            <p className="text-gray-600 dark:text-gray-400">Drag and drop files here or click to browse</p>
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm">Select File</button>
          </div>
        </Card>
      )}

      {activeTab === 'duplicates' && (
        <div className="space-y-4">
          {duplicates?.length === 0 ? (
            <p className="text-sm text-gray-500">No duplicate transactions detected.</p>
          ) : (
            duplicates?.map((group, i) => (
              <Card key={i} title={`Duplicate Group - ${group[0].transaction_date}`}>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {group.map(tx => (
                    <div key={tx.id} className="py-2 flex justify-between text-sm">
                      <span>{tx.reference_number}</span>
                      <span className="font-bold text-red-600">${tx.amount}</span>
                    </div>
                  ))}
                </div>
                {!readOnly && (
                  <button className="mt-4 text-xs text-red-600 hover:underline">Merge or Delete Duplicates</button>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'logs' && <Card title="Import Logs"><p className="text-sm text-gray-500">History of all data imports will appear here.</p></Card>}
    </div>
  )
}