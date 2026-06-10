export interface Company {
  id: string
  name: string
  code: string
  address?: string
  city?: string
  country?: string
  currency: string
  fiscal_year_start?: string
  fiscal_year_end?: string
  is_active: boolean
  logo_url?: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  phone?: string
  company_id?: string
  is_active: boolean
  mfa_enabled: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
  roles?: Role[]
}

export interface Role {
  id: string
  name: string
  description?: string
  is_system: boolean
}

export interface Permission {
  id: string
  code: string
  name: string
  module: string
  description?: string
}

export interface BankAccount {
  id: string
  company_id: string
  account_name: string
  account_number: string
  bank_name: string
  currency: string
  account_type: 'checking' | 'savings' | 'credit_card' | 'investment'
  opening_balance: number
  current_balance: number
  is_active: boolean
  created_at: string
}

export interface BankStatement {
  id: string
  bank_account_id: string
  company_id: string
  statement_date: string
  start_date: string
  end_date: string
  opening_balance: number
  closing_balance: number
  total_debits: number
  total_credits: number
  transaction_count: number
  file_name?: string
  file_url?: string
  status: 'pending' | 'imported' | 'matched' | 'reconciled' | 'exception'
  created_by: string
}

export interface Transaction {
  id: string
  company_id: string
  transaction_date: string
  value_date?: string
  amount: number
  debit_amount: number
  credit_amount: number
  currency: string
  reference_number?: string
  description?: string
  transaction_type: 'payment' | 'receipt' | 'transfer' | 'journal' | 'fee' | 'refund' | 'chargeback'
  source: 'manual' | 'csv' | 'xlsx' | 'xml' | 'json' | 'ofx' | 'qif' | 'api'
  category?: string
  status: 'unreconciled' | 'matched' | 'reconciled' | 'exception' | 'pending'
  bank_account_id?: string
  bank_statement_id?: string
  external_id?: string
  created_by: string
}

export interface ReconciliationMatch {
  id: string
  company_id: string
  transaction_id: string
  bank_statement_id: string
  bank_transaction_ref?: string
  match_type: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many' | 'manual' | 'auto'
  match_status: 'proposed' | 'confirmed' | 'rejected' | 'unmatched'
  confidence_score?: number
  matched_by: string
  matched_at: string
  notes?: string
}

export interface Reconciliation {
  id: string
  company_id: string
  bank_account_id: string
  bank_statement_id: string
  reconciliation_date: string
  start_balance: number
  end_balance: number
  difference: number
  total_matched: number
  total_unmatched: number
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'completed'
  submitted_by?: string
  submitted_at?: string
  approved_by?: string
  approved_at?: string
  notes?: string
}

export interface Exception {
  id: string
  company_id: string
  reconciliation_id?: string
  transaction_id?: string
  exception_type: 'missing_transaction' | 'duplicate_transaction' | 'amount_difference' | 'date_difference' | 'unauthorized_transaction' | 'reference_mismatch' | 'bank_error' | 'other'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  expected_amount?: number
  actual_amount?: number
  expected_date?: string
  actual_date?: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated'
  assigned_to?: string
  resolution_notes?: string
  resolved_by?: string
  resolved_at?: string
}

export interface ReconciliationRule {
  id: string
  company_id: string
  name: string
  description?: string
  rule_type: 'amount_exact' | 'amount_range' | 'date_exact' | 'date_range' | 'reference_number' | 'transaction_id' | 'description' | 'customer_id' | 'custom'
  match_priority: number
  config: Record<string, unknown>
  is_active: boolean
  created_by: string
}

export interface ApprovalWorkflow {
  id: string
  company_id: string
  name: string
  description?: string
  entity_type: 'reconciliation' | 'exception' | 'import' | 'report'
  steps: ApprovalStep[]
  is_active: boolean
}

export interface ApprovalStep {
  step: number
  role_id: string
  role_name: string
  action: 'approve' | 'reject' | 'return'
}

export interface ApprovalRequest {
  id: string
  company_id: string
  workflow_id: string
  entity_type: string
  entity_id: string
  current_step: number
  total_steps: number
  status: 'pending' | 'approved' | 'rejected' | 'returned' | 'cancelled'
  requested_by: string
  requested_at: string
  completed_at?: string
}

export interface AuditLog {
  id: string
  company_id: string
  user_id: string
  action: string
  entity_type: string
  entity_id?: string
  details: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at: string
  user?: User
}

export interface Notification {
  id: string
  company_id: string
  user_id: string
  title: string
  message: string
  type: 'reconciliation_completed' | 'new_exception' | 'approval_required' | 'import_failed' | 'match_found' | 'report_ready' | 'system'
  reference_type?: string
  reference_id?: string
  is_read: boolean
  is_archived: boolean
  created_at: string
}

export interface Report {
  id: string
  company_id: string
  name: string
  type: 'daily_reconciliation' | 'monthly_reconciliation' | 'bank_reconciliation' | 'exception_report' | 'audit_report' | 'custom'
  parameters: Record<string, unknown>
  file_url?: string
  format: 'pdf' | 'csv' | 'xlsx'
  status: 'pending' | 'generating' | 'completed' | 'failed'
  created_by: string
  created_at: string
  generated_at?: string
}



export interface PaymentGatewayTransaction {
  id: string
  company_id: string
  integration_id: string
  transaction_id: string
  amount: number
  fee: number
  net_amount: number
  currency: string
  status: 'pending' | 'settled' | 'refunded' | 'chargeback' | 'failed'
  payment_method?: string
  customer_email?: string
  transaction_date: string
  settlement_date?: string
  reference_number?: string
  metadata: Record<string, unknown>
}

export interface Invoice {
  id: string
  company_id: string
  invoice_number: string
  invoice_date: string
  due_date?: string
  customer_id?: string
  customer_name?: string
  customer_email?: string
  total_amount: number
  tax_amount: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded'
}

export interface PurchaseOrder {
  id: string
  company_id: string
  po_number: string
  vendor_name: string
  vendor_email?: string
  order_date: string
  expected_delivery_date?: string
  items: { description: string; quantity: number; unit_price: number; total: number }[]
  subtotal: number
  tax_amount: number
  total_amount: number
  currency: string
  status: 'draft' | 'sent' | 'approved' | 'received' | 'cancelled'
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Integration {
  id: string
  company_id: string
  provider:
    | 'stripe'
    | 'paypal'
    | 'paymongo'
    | 'gcash'
    | 'maya'
    | 'quickbooks'
    | 'xero'
    | 'zoho_books'
    | 'sap'
    | 'oracle'
    | 'netsuite'
    | 'ms_dynamics'
    | 'sage'
    | 'oracle_netSuite'
    | 'custom'
  name: string
  api_key?: string
  webhook_secret?: string
  environment: 'sandbox' | 'production'
  is_active: boolean
  last_sync_at?: string
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}


export interface DashboardStats {
  total_transactions: number
  pending_reconciliations: number
  completed_reconciliations: number
  error_rate: number
  total_matched: number
  total_unmatched: number
  bank_balances: number
  recent_activities: AuditLog[]
  reconciliation_trend: { date: string; matched: number; unmatched: number }[]
}
