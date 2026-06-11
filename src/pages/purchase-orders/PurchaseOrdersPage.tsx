import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReadOnly } from '../../components/rbac/ReadOnlyGuard'
import { purchaseOrdersApi } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { getCurrentCompanyId } from '../../lib/company'
import { useUserProfile } from '../../lib/profile'
import toast from 'react-hot-toast'
import type { PurchaseOrder } from '../../types'

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  draft: 'default',
  sent: 'info',
  approved: 'success',
  received: 'success',
  cancelled: 'danger',
}

export function PurchaseOrdersPage() {
  const queryClient = useQueryClient()
  const [companyId, setCompanyId] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editPo, setEditPo] = useState<PurchaseOrder | null>(null)
  const [deletePo, setDeletePo] = useState<PurchaseOrder | null>(null)
  const readOnly = useReadOnly()
  const { user } = useUserProfile()

  useEffect(() => {
    getCurrentCompanyId().then(setCompanyId)
  }, [])

  const { data: orders, isLoading } = useQuery({
    queryKey: ['purchaseOrders', companyId],
    queryFn: () => purchaseOrdersApi.list(companyId),
    enabled: !!companyId,
  })

  const [form, setForm] = useState({
    vendor_name: '', vendor_email: '', order_date: '', expected_delivery_date: '',
    items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
    subtotal: 0, tax_amount: 0, total_amount: 0, currency: 'USD',
    status: 'draft' as PurchaseOrder['status'], notes: '', po_number: '',
  })

  const resetForm = () => {
    setForm({
      vendor_name: '', vendor_email: '', order_date: '', expected_delivery_date: '',
      items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
      subtotal: 0, tax_amount: 0, total_amount: 0, currency: 'USD',
      status: 'draft' as PurchaseOrder['status'], notes: '', po_number: '',
    })
  }

  const recalcTotals = (items: typeof form.items) => {
    const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const tax = subtotal * 0.1
    const total = subtotal + tax
    return { subtotal, tax_amount: tax, total_amount: total }
  }

  const updateItem = (idx: number, field: string, value: string | number) => {
    const items = form.items.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        updated.total = updated.quantity * updated.unit_price
      }
      return updated
    })
    setForm({ ...form, items, ...recalcTotals(items) })
  }

  const addItem = () => {
    const items = [...form.items, { description: '', quantity: 1, unit_price: 0, total: 0 }]
    setForm({ ...form, items, ...recalcTotals(items) })
  }

  const removeItem = (idx: number) => {
    const items = form.items.filter((_, i) => i !== idx)
    setForm({ ...form, items, ...recalcTotals(items) })
  }

  const createMutation = useMutation({
    mutationFn: () => purchaseOrdersApi.create({
      company_id: companyId,
      po_number: form.po_number || `PO-${Date.now().toString(36).toUpperCase()}`,
      vendor_name: form.vendor_name,
      vendor_email: form.vendor_email,
      order_date: form.order_date,
      expected_delivery_date: form.expected_delivery_date,
      items: form.items,
      subtotal: form.subtotal,
      tax_amount: form.tax_amount,
      total_amount: form.total_amount,
      currency: form.currency,
      status: form.status,
      notes: form.notes,
      created_by: user?.id || '',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      setShowCreate(false)
      resetForm()
      toast.success('Purchase order created')
    },
    onError: () => toast.error('Failed to create purchase order'),
  })

  const updateMutation = useMutation({
    mutationFn: () => purchaseOrdersApi.update(editPo!.id, {
      vendor_name: form.vendor_name,
      vendor_email: form.vendor_email,
      order_date: form.order_date,
      expected_delivery_date: form.expected_delivery_date,
      items: form.items,
      subtotal: form.subtotal,
      tax_amount: form.tax_amount,
      total_amount: form.total_amount,
      currency: form.currency,
      status: form.status,
      notes: form.notes,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      setEditPo(null)
      resetForm()
      toast.success('Purchase order updated')
    },
    onError: () => toast.error('Failed to update purchase order'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => purchaseOrdersApi.delete(deletePo!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      setDeletePo(null)
      toast.success('Purchase order deleted')
    },
    onError: () => toast.error('Failed to delete purchase order'),
  })

  const openEdit = (po: PurchaseOrder) => {
    setEditPo(po)
    setForm({
      vendor_name: po.vendor_name,
      vendor_email: po.vendor_email || '',
      order_date: po.order_date,
      expected_delivery_date: po.expected_delivery_date || '',
      items: po.items,
      subtotal: po.subtotal,
      tax_amount: po.tax_amount,
      total_amount: po.total_amount,
      currency: po.currency,
      status: po.status,
      notes: po.notes || '',
      po_number: po.po_number,
    })
  }

  const columns = [
    { key: 'po_number', header: 'PO #' },
    { key: 'vendor_name', header: 'Vendor' },
    { key: 'order_date', header: 'Date', render: (po: PurchaseOrder) => new Date(po.order_date).toLocaleDateString() },
    {
      key: 'total_amount', header: 'Amount',
      render: (po: PurchaseOrder) => <span className="font-medium">${po.total_amount.toLocaleString()}</span>,
    },
    { key: 'status', header: 'Status', render: (po: PurchaseOrder) => <Badge variant={statusVariant[po.status]}>{po.status}</Badge> },
    {
      key: 'actions', header: '',
      render: (po: PurchaseOrder) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button disabled={readOnly} onClick={() => openEdit(po)} className="text-xs text-blue-600 hover:underline">Edit</button>
          <button disabled={readOnly} onClick={() => setDeletePo(po)} className="text-xs text-red-600 hover:underline">Delete</button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Purchase Orders</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage vendor purchase orders</p>
        </div>
        <Button disabled={readOnly} onClick={() => { resetForm(); setShowCreate(true) }}>Add Purchase Order</Button>
      </div>

      <Card>
        <Table columns={columns} data={orders || []} loading={isLoading} emptyMessage="No purchase orders found." />
      </Card>

      <Modal isOpen={showCreate || !!editPo} onClose={() => { setShowCreate(false); setEditPo(null); resetForm() }} title={editPo ? 'Edit Purchase Order' : 'Add Purchase Order'} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); if (readOnly) return; editPo ? updateMutation.mutate() : createMutation.mutate() }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="PO Number" value={form.po_number} onChange={(e) => setForm({ ...form, po_number: e.target.value })} placeholder="Auto-generated" />
            <Input label="Order Date" type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Vendor Name" value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} required />
            <Input label="Vendor Email" type="email" value={form.vendor_email} onChange={(e) => setForm({ ...form, vendor_email: e.target.value })} />
          </div>
          <Input label="Expected Delivery Date" type="date" value={form.expected_delivery_date} onChange={(e) => setForm({ ...form, expected_delivery_date: e.target.value })} />
          <Input label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Line Items</label>
            {form.items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-start mb-2">
                <input value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Description" className="flex-1 px-2 py-1.5 text-sm border rounded dark:bg-gray-800 dark:border-gray-700" />
                <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} className="w-20 px-2 py-1.5 text-sm border rounded dark:bg-gray-800 dark:border-gray-700" />
                <input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1.5 text-sm border rounded dark:bg-gray-800 dark:border-gray-700" />
                <span className="text-sm py-1.5 w-20 text-right font-medium">${item.total.toFixed(2)}</span>
                {form.items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)} className="text-red-500 text-sm py-1.5">x</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline">+ Add Item</button>
          </div>

          <div className="flex justify-end gap-4 border-t pt-3 text-sm">
            <span>Subtotal: <strong>${form.subtotal.toFixed(2)}</strong></span>
            <span>Tax (10%): <strong>${form.tax_amount.toFixed(2)}</strong></span>
            <span>Total: <strong>${form.total_amount.toFixed(2)}</strong></span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PurchaseOrder['status'] })} className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700">
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="approved">Approved</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowCreate(false); setEditPo(null); resetForm() }}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>{editPo ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletePo}
        onClose={() => setDeletePo(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Purchase Order"
        message={`Delete purchase order ${deletePo?.po_number}? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
