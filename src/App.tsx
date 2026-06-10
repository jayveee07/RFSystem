import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { TransactionsPage } from './pages/transactions/TransactionsPage'
import { BankStatementsPage } from './pages/reconciliation/BankStatementsPage'
import { ReconciliationPage } from './pages/reconciliation/ReconciliationPage'
import { PaymentGatewayPage } from './pages/reconciliation/PaymentGatewayPage'
import { InvoicesPage } from './pages/reconciliation/InvoicesPage'
import { ExceptionsPage } from './pages/exceptions/ExceptionsPage'
import { RulesPage } from './pages/rules/RulesPage'
import { ApprovalsPage } from './pages/approvals/ApprovalsPage'
import { AuditPage } from './pages/audit/AuditPage'
import { AuditTrailPage } from './pages/audit/AuditTrailPage'
import { SecurityCenterPage } from './pages/audit/SecurityCenterPage'
import { ReportsPage } from './pages/reports/ReportsPage'
import { NotificationsPage } from './pages/notifications/NotificationsPage'
import { CompaniesPage } from './pages/companies/CompaniesPage'
import { AnalyticsPage } from './lib/AnalyticsPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { SetupPage } from './pages/settings/SetupPage'
import { UsersPage } from './pages/admin/UsersPage'
import { RolesPage } from './pages/admin/RolesPage'
import { PermissionsPage } from './pages/admin/PermissionsPage'
import { IntegrationsPage } from './pages/admin/IntegrationsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/bank-statements" element={<BankStatementsPage />} />
        <Route path="/reconciliation" element={<ReconciliationPage />} />
        <Route path="/payment-gateway" element={<PaymentGatewayPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/exceptions" element={<ExceptionsPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/audit-trail" element={<AuditTrailPage />} />
        <Route path="/security" element={<SecurityCenterPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/roles" element={<RolesPage />} />
        <Route path="/permissions" element={<PermissionsPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
