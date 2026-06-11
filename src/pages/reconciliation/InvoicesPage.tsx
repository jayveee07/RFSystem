import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { invoicesApi } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { getCurrentCompanyId } from '../../lib/company'
import type { Invoice } from '../../types'

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  paid: 'success',
  sent: 'info',
  draft: 'default',
  overdue: 'danger',
  cancelled: 'warning',
  refunded: 'info',
}

export function InvoicesPage() {
  const [companyId, setCompanyId] = useState('')

  useEffect(() => {
    getCurrentCompanyId().then(setCompanyId)
  }, [])

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', companyId],
    queryFn: () => invoicesApi.list(companyId),
    enabled: !!companyId,
  })

  const columns = [
    { key: 'invoice_number', header: 'Invoice #' },
    { key: 'customer_name', header: 'Customer' },
    {
      key: 'invoice_date', header: 'Date',
      render: (i: Invoice) => new Date(i.invoice_date).toLocaleDateString(),
    },
    {
      key: 'total_amount', header: 'Amount',
      render: (i: Invoice) => <span className="font-medium">${i.total_amount.toLocaleString()}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (i: Invoice) => <Badge variant={statusVariant[i.status]}>{i.status}</Badge>,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Invoices</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Accounts Receivable - Customer invoice reconciliation</p>
      </div>

      <Card>
        <Table columns={columns} data={invoices || []} loading={isLoading} emptyMessage="No invoices found." />
      </Card>
    </div>
  )
}
