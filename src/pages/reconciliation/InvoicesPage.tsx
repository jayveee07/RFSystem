import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReadOnly } from '../../components/rbac/ReadOnlyGuard'
import { invoicesApi } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { getCurrentCompanyId } from '../../lib/company'
import toast from 'react-hot-toast'
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
  const queryClient = useQueryClient()
  const [companyId, setCompanyId] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null)
  const [deleteInvoice, setDeleteInvoice] = useState<Invoice | null>(null)
  const readOnly = useReadOnly()

  useEffect(() => {
    getCurrentCompanyId().then(setCompanyId)
  }, [])

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', companyId],
    queryFn: () => invoicesApi.list(companyId),
    enabled: !!companyId,
  })

  const [form, setForm] = useState({
    invoice_number: '', customer_name: '', customer_email: '', invoice_date: '',
    due_date: '', total_amount: '', tax_amount: '', currency: 'USD',
    status: 'draft' as Invoice['status'],
  })

  const resetForm = () => {
    setForm({
      invoice_number: '', customer_name: '', customer_email: '', invoice_date: '',
      due_date: '', total_amount: '', tax_amount: '', currency: 'USD',
      status: 'draft' as Invoice['status'],
    })
  }

  const createMutation = useMutation({
    mutationFn: () => invoicesApi.create({
      company_id: companyId,
      invoice_number: form.invoice_number || `INV-${Date.now().toString(36).toUpperCase()}`,
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      invoice_date: form.invoice_date,
      due_date: form.due_date,
      total_amount: parseFloat(form.total_amount) || 0,
      tax_amount: parseFloat(form.tax_amount) || 0,
      currency: form.currency,
      status: form.status,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setShowCreate(false)
      resetForm()
      toast.success('Invoice created')
    },
    onError: () => toast.error('Failed to create invoice'),
  })

  const updateMutation = useMutation({
    mutationFn: () => invoicesApi.update(editInvoice!.id, {
      invoice_number: form.invoice_number,
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      invoice_date: form.invoice_date,
      due_date: form.due_date,
      total_amount: parseFloat(form.total_amount) || 0,
      tax_amount: parseFloat(form.tax_amount) || 0,
      currency: form.currency,
      status: form.status,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setEditInvoice(null)
      resetForm()
      toast.success('Invoice updated')
    },
    onError: () => toast.error('Failed to update invoice'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => invoicesApi.delete(deleteInvoice!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setDeleteInvoice(null)
      toast.success('Invoice deleted')
    },
    onError: () => toast.error('Failed to delete invoice'),
  })

  const openEdit = (inv: Invoice) => {
    setEditInvoice(inv)
    setForm({
      invoice_number: inv.invoice_number,
      customer_name: inv.customer_name || '',
      customer_email: inv.customer_email || '',
      invoice_date: inv.invoice_date,
      due_date: inv.due_date || '',
      total_amount: inv.total_amount.toString(),
      tax_amount: inv.tax_amount.toString(),
      currency: inv.currency,
      status: inv.status,
    })
  }

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
    {
      key: 'actions', header: '',
      render: (i: Invoice) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button disabled={readOnly} onClick={() => openEdit(i)} className="text-xs text-blue-600 hover:underline">Edit</button>
          <button disabled={readOnly} onClick={() => setDeleteInvoice(i)} className="text-xs text-red-600 hover:underline">Delete</button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Invoices</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Accounts Receivable - Customer invoice reconciliation</p>
        </div>
        <Button disabled={readOnly} onClick={() => { resetForm(); setShowCreate(true) }}>Add Invoice</Button>
      </div>

      <Card>
        <Table columns={columns} data={invoices || []} loading={isLoading} emptyMessage="No invoices found." />
      </Card>

      <Modal isOpen={showCreate || !!editInvoice} onClose={() => { setShowCreate(false); setEditInvoice(null); resetForm() }} title={editInvoice ? 'Edit Invoice' : 'Add Invoice'} size="md">
        <form onSubmit={(e) => { e.preventDefault(); if (readOnly) return; editInvoice ? updateMutation.mutate() : createMutation.mutate() }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Invoice Number" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} placeholder="Auto-generated" />
            <Input label="Invoice Date" type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Customer Name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
            <Input label="Customer Email" type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Due Date" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            <Input label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Total Amount" type="number" step="0.01" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} required />
            <Input label="Tax Amount" type="number" step="0.01" value={form.tax_amount} onChange={(e) => setForm({ ...form, tax_amount: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Invoice['status'] })} className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700">
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowCreate(false); setEditInvoice(null); resetForm() }}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>{editInvoice ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteInvoice}
        onClose={() => setDeleteInvoice(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Invoice"
        message={`Delete invoice ${deleteInvoice?.invoice_number}? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
