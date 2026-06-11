import { useMemo } from 'react'
import { useUserProfile } from '../../lib/profile'
import { AdminDashboardPage } from '../admin/AdminDashboardPage'
import { FinanceManagerDashboard } from './FinanceManagerDashboard'
import { AuditorDashboard } from './AuditorDashboard'
import { AccountantDashboard } from './AccountantDashboard'
import { ViewerDashboard } from './ViewerDashboard'
import { CFOExecutiveDashboard } from './CFOExecutiveDashboard'
import { Card } from '../../components/ui/Card'

export function DashboardPage() {
  const { loading, user, roles } = useUserProfile()

  const roleNames = useMemo(() => roles.map((role) => role.name), [roles])
  const primaryRole = useMemo(() => {
    if (roleNames.includes('Administrator')) return 'Administrator'
    if (roleNames.includes('CFO Executive')) return 'CFO Executive'
    if (roleNames.includes('Finance Manager')) return 'Finance Manager'
    if (roleNames.includes('Accountant')) return 'Accountant'
    if (roleNames.includes('Auditor')) return 'Auditor'
    if (roleNames.includes('Viewer')) return 'Viewer'
    return null
  }, [roleNames])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Card>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dashboard Loading</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Your profile is loading, please wait.</p>
          </div>
        </Card>
      </div>
    )
  }

  switch (primaryRole) {
    case 'Administrator':
      return <AdminDashboardPage />
    case 'Finance Manager':
      return <FinanceManagerDashboard />
    case 'Accountant':
      return <AccountantDashboard />
    case 'Auditor':
      return <AuditorDashboard />
    case 'Viewer':
      return <ViewerDashboard />
    case 'CFO Executive':
      return <CFOExecutiveDashboard />
    default:
      return <FinanceManagerDashboard />
  }
}
