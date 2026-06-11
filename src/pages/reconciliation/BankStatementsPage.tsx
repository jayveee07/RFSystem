import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReadOnly } from '../../components/rbac/ReadOnlyGuard'
import { bankStatementsApi, bankAccountsApi } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { getCurrentCompanyId } from '../../lib/company'
import toast from 'react-hot-toast'
import type { BankStatement, BankAccount } from '../../types'

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  reconciled: 'success',
  matched: 'info',
  imported: 'info',
  pending: 'warning',
  exception: 'danger',
}

export function BankStatementsPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [companyId, setCompanyId] = useState('')
  const readOnly = useReadOnly()

  useEffect(() => {
    getCurrentCompanyId().then(setCompanyId)
  }, [])

  const { data: statements, isLoading } = useQuery({
    queryKey: ['bankStatements', companyId],
    queryFn: () => bankStatementsApi.list(companyId),
    enabled: !!companyId,
  })

  const { data: accounts } = useQuery({
    queryKey: ['bankAccounts', companyId],
    queryFn: () => bankAccountsApi.list(companyId),
    enabled: !!companyId,
  })

  const [newStmt, setNewStmt] = useState({
    bank_account_id: '', statement_date: '', start_date: '', end_date: '',
    opening_balance: '', closing_balance: '',
  })

  const createMutation = useMutation({
    mutationFn: () => bankStatementsApi.create({
      company_id: companyId,
      bank_account_id: newStmt.bank_account_id,
      statement_date: newStmt.statement_date,
      start_date: newStmt.start_date,
      end_date: newStmt.end_date,
      opening_balance: parseFloat(newStmt.opening_balance),
      closing_balance: parseFloat(newStmt.closing_balance),
      status: 'pending',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankStatements'] })
      setShowCreate(false)
      toast.success('Bank statement created')
    },
    onError: () => toast.error('Failed to create statement'),
  })

  const columns = [
    { key: 'statement_date', header: 'Statement Date', render: (s: BankStatement) => new Date(s.statement_date).toLocaleDateString() },
    { key: 'bank_name', header: 'Bank', render: (s: BankStatement & { bank_accounts?: BankAccount }) => s.bank_accounts?.bank_name || '-' },
    { key: 'account_name', header: 'Account', render: (s: BankStatement & { bank_accounts?: BankAccount }) => s.bank_accounts?.account_name || '-' },
    { key: 'opening_balance', header: 'Opening', render: (s: BankStatement) => <span className="font-medium">${s.opening_balance.toLocaleString()}</span> },
    { key: 'closing_balance', header: 'Closing', render: (s: BankStatement) => <span className="font-medium">${s.closing_balance.toLocaleString()}</span> },
    { key: 'transaction_count', header: 'Transactions' },
    { key: 'status', header: 'Status', render: (s: BankStatement) => <Badge variant={statusVariant[s.status]}>{s.status}</Badge> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bank Statements</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Upload and manage bank statements for reconciliation</p>
        </div>
        <Button disabled={readOnly} onClick={() => setShowCreate(true)}>Add Statement</Button>
      </div>

      <Card>
        <Table columns={columns} data={statements || []} loading={isLoading} emptyMessage="No bank statements yet." />
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Bank Statement" size="md">
        <form onSubmit={(e) => { e.preventDefault(); if (readOnly) return; createMutation.mutate() }} className="space-y-4">
          <Select label="Bank Account" options={(accounts || []).map((a: BankAccount) => ({ value: a.id, label: `${a.bank_name} - ${a.account_name}` }))} value={newStmt.bank_account_id} onChange={(e) => setNewStmt({ ...newStmt, bank_account_id: e.target.value })} required />
          <Input label="Statement Date" type="date" value={newStmt.statement_date} onChange={(e) => setNewStmt({ ...newStmt, statement_date: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={newStmt.start_date} onChange={(e) => setNewStmt({ ...newStmt, start_date: e.target.value })} required />
            <Input label="End Date" type="date" value={newStmt.end_date} onChange={(e) => setNewStmt({ ...newStmt, end_date: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Opening Balance" type="number" step="0.01" value={newStmt.opening_balance} onChange={(e) => setNewStmt({ ...newStmt, opening_balance: e.target.value })} required />
            <Input label="Closing Balance" type="number" step="0.01" value={newStmt.closing_balance} onChange={(e) => setNewStmt({ ...newStmt, closing_balance: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
