import { useQuery } from '@tanstack/react-query'
import { paymentGatewayApi } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { getCurrentCompanyId } from '../../lib/company'
import { useState, useEffect } from 'react'
import type { PaymentGatewayTransaction, Integration } from '../../types'

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  settled: 'success',
  pending: 'warning',
  refunded: 'info',
  chargeback: 'danger',
  failed: 'danger',
}

export function PaymentGatewayPage() {
  const [companyId, setCompanyId] = useState('')

  useEffect(() => {
    getCurrentCompanyId().then(setCompanyId)
  }, [])

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['paymentTransactions', companyId],
    queryFn: () => paymentGatewayApi.list(companyId),
    enabled: !!companyId,
  })

  const columns = [
    { key: 'transaction_id', header: 'Transaction ID' },
    { key: 'amount', header: 'Amount', render: (t: PaymentGatewayTransaction) => <span className="font-medium">${t.amount.toLocaleString()}</span> },
    { key: 'fee', header: 'Fee', render: (t: PaymentGatewayTransaction) => `$${t.fee.toFixed(2)}` },
    { key: 'net_amount', header: 'Net', render: (t: PaymentGatewayTransaction) => <span className="font-medium">${t.net_amount.toLocaleString()}</span> },
    {
      key: 'provider', header: 'Provider',
      render: (t: PaymentGatewayTransaction & { integrations?: Integration }) => t.integrations?.name || '-',
    },
    {
      key: 'status', header: 'Status',
      render: (t: PaymentGatewayTransaction) => <Badge variant={statusVariant[t.status]}>{t.status}</Badge>,
    },
    {
      key: 'transaction_date', header: 'Date',
      render: (t: PaymentGatewayTransaction) => new Date(t.transaction_date).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Gateway Reconciliation</h1>
        <p className="text-gray-500 mt-1">Reconcile payment gateway transactions (Stripe, PayPal, PayMongo, GCash, Maya)</p>
      </div>

      <Card>
        <Table columns={columns} data={transactions || []} loading={isLoading} emptyMessage="No payment gateway transactions found." />
      </Card>
    </div>
  )
}
