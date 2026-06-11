import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { transactionsApi } from '../../lib/api'
import { getCurrentCompanyId } from '../../lib/company'
import { useUserProfile } from '../../lib/profile'
import { isViewer } from '../../lib/rbac'
import { useReadOnly } from '../../components/rbac/ReadOnlyGuard'
import toast from 'react-hot-toast'
import type { Transaction } from '../../types'

type ParsedRow = {
  date: string
  description: string
  debit: number
  credit: number
  reference: string
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const header = lines[0].toLowerCase()
  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    header.split(',').forEach((h, idx) => {
      row[h.replace(/^"|"$/g, '').trim()] = cols[idx] || ''
    })
    const date = row.date || row.transaction_date || row['transaction date'] || ''
    const description = row.description || row.narration || row.memo || row.details || ''
    const debit = parseFloat(row.debit || row.debit_amount || row.withdrawal || row[' debit'] || '0')
    const credit = parseFloat(row.credit || row.credit_amount || row.deposit || row[' credit'] || '0')
    const reference = row.reference || row.reference_number || row['reference number'] || row.ref_no || row.transaction_id || ''
    if (date || description) {
      rows.push({ date, description, debit: isNaN(debit) ? 0 : debit, credit: isNaN(credit) ? 0 : credit, reference })
    }
  }
  return rows
}

export function TransactionsPage() {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [companyId, setCompanyId] = useState('')
  const [activeTab, setActiveTab] = useState<'list' | 'upload' | 'duplicates' | 'logs'>('list')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)

  const { user } = useUserProfile()
  const readOnly = useReadOnly()
  const isViewerUser = user ? isViewer(user) : false

  useEffect(() => {
    getCurrentCompanyId().then(setCompanyId)
  }, [])

  const { data: txData, isLoading, error } = useQuery({
    queryKey: ['transactions', companyId],
    queryFn: async () => {
      const params = companyId ? { companyId } : {}
      const result = await transactionsApi.list(params)
      if (result.data.length === 0 && companyId) {
        return await transactionsApi.list({}).catch(() => result)
      }
      return result
    },
    enabled: activeTab === 'list',
    retry: 1,
  })

  const { data: duplicates } = useQuery({
    queryKey: ['tx-duplicates', companyId],
    queryFn: () => transactionsApi.detectDuplicates(companyId || 'none'),
    enabled: !!companyId && activeTab === 'duplicates',
  })

  const { data: importLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['importLogs', companyId],
    queryFn: () => transactionsApi.getImportLogs(companyId || 'none'),
    enabled: !!companyId && activeTab === 'logs',
  })

  const importMutation = useMutation({
    mutationFn: async () => {
      const items = parsedRows.map(r => ({
        company_id: companyId,
        transaction_date: r.date,
        description: r.description,
        debit_amount: r.debit,
        credit_amount: r.credit,
        amount: r.debit || r.credit,
        reference_number: r.reference || `IMP-${Date.now().toString(36).toUpperCase()}`,
        source: 'csv' as const,
        status: 'unreconciled' as const,
        currency: 'USD',
      }))
      return transactionsApi.bulkCreate(items)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['importLogs'] })
      setParsedRows([])
      toast.success(`${importMutation.data?.length || parsedRows.length} transactions imported`)
    },
    onError: () => toast.error('Failed to import transactions'),
  })

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }
    const text = await file.text()
    const rows = parseCSV(text)
    if (rows.length === 0) {
      toast.error('No valid rows found in CSV')
      return
    }
    setParsedRows(rows)
    toast.success(`Parsed ${rows.length} rows`)
  }

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
        <Card title="Transaction History" subtitle={companyId ? `Company filter: ${companyId}` : 'Showing all transactions'}>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 text-sm">Failed to load transactions.</p>
              <p className="text-gray-400 text-xs mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
              <button onClick={() => window.location.reload()} className="mt-3 text-xs text-blue-600 hover:underline">Retry</button>
            </div>
          ) : !txData || txData.data.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No transactions found.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Reference</th>
                  <th className="pb-3 pr-4">Debit</th>
                  <th className="pb-3 pr-4">Credit</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {txData.data.map((tx) => (
                  <tr key={tx.id} className="text-sm">
                    <td className="py-3 pr-4">{tx.transaction_date}</td>
                    <td className="py-3 pr-4 font-mono">{tx.reference_number}</td>
                    <td className="py-3 pr-4">${tx.debit_amount?.toFixed(2)}</td>
                    <td className="py-3 pr-4">${tx.credit_amount?.toFixed(2)}</td>
                    <td className="py-3"><Badge variant={tx.status === 'reconciled' ? 'success' : 'warning'}>{tx.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {activeTab === 'upload' && (
        <Card title="Import CSV">
          <div className="space-y-4">
            <input ref={fileRef} type="file" accept=".csv" onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              if (fileRef.current) fileRef.current.value = ''
            }} className="hidden" />
            <div
              onClick={() => fileRef.current?.click()}
              className="p-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-center cursor-pointer hover:border-blue-400 transition-colors"
            >
              <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Select CSV file to import</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Supports: date, description, debit, credit, reference columns</p>
            </div>

            {parsedRows.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview ({parsedRows.length} rows)</h3>
                <div className="max-h-64 overflow-y-auto border rounded-lg dark:border-gray-700">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-right">Debit</th>
                        <th className="px-3 py-2 text-right">Credit</th>
                        <th className="px-3 py-2 text-left">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {parsedRows.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-3 py-1.5">{r.date}</td>
                          <td className="px-3 py-1.5 max-w-xs truncate">{r.description}</td>
                          <td className="px-3 py-1.5 text-right text-red-600">{r.debit > 0 ? `$${r.debit.toFixed(2)}` : ''}</td>
                          <td className="px-3 py-1.5 text-right text-green-600">{r.credit > 0 ? `$${r.credit.toFixed(2)}` : ''}</td>
                          <td className="px-3 py-1.5 font-mono">{r.reference}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setParsedRows([])}>Clear</Button>
                  <Button onClick={() => importMutation.mutate()} loading={importMutation.isPending}>Import {parsedRows.length} Transactions</Button>
                </div>
              </div>
            )}
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

      {activeTab === 'logs' && (
        <Card title="Import Logs">
          {logsLoading ? (
            <div className="flex justify-center py-8">
              <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : !importLogs || importLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No import logs yet.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">File</th>
                  <th className="pb-3 pr-4">Rows</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {importLogs.map((log: any, i: number) => (
                  <tr key={log.id || i} className="text-sm">
                    <td className="py-3 pr-4">{log.created_at ? new Date(log.created_at).toLocaleString() : '-'}</td>
                    <td className="py-3 pr-4">{log.file_name || log.filename || '-'}</td>
                    <td className="py-3 pr-4">{log.row_count ?? log.rows ?? '-'}</td>
                    <td className="py-3"><Badge variant={log.status === 'completed' ? 'success' : 'warning'}>{log.status || 'completed'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  )
}