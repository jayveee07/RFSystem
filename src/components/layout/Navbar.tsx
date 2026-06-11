import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'
import { notificationsApi } from '../../lib/api'
import { useTheme } from '../../lib/theme'
import { ConfirmDialog } from '../ui/ConfirmDialog'

export function Navbar() {
  const { mode, toggle } = useTheme()
  const [user, setUser] = useState<{ uid?: string; email?: string; full_name?: string } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser({ uid: u.uid, email: u.email || undefined })
        const snap = await getDoc(doc(db, 'users', u.uid))
        if (snap.exists()) {
          setUser((prev) => ({ ...prev, full_name: snap.data().full_name }))
        }
      } else {
        setUser(null)
      }
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const fetchCount = async () => {
      const u = auth.currentUser
      if (u) {
        const count = await notificationsApi.getUnreadCount(u.uid)
        setUnreadCount(count)
      }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleSignOut = async () => {
    setShowDropdown(false)
    setShowLogoutConfirm(true)
  }

  const confirmSignOut = async () => {
    await signOut(auth)
    window.location.href = '/login'
  }

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6">

      <div className="flex items-center gap-3">
        <img src="/Logo_FRS.png" alt="FRS logo" className="w-9 h-9 rounded-lg object-contain" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Financial Reconciliation System</h2>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle theme"
        >
          {mode === 'dark' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-8.66h-1M4.34 12H3.34m14.32 5.32l-.71-.71M6.39 6.39l-.71-.71m12.02 0l-.71.71M6.39 17.61l-.71.71M12 7a5 5 0 100 10 5 5 0 000-10z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3C9.238 3 7 5.238 7 8c0 2.523 1.717 4.64 4.052 5.38A5.002 5.002 0 0112 3z" />
            </svg>
          )}
        </button>
        <Link to="/notifications" className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
              {unreadCount}
            </span>
          )}
        </Link>
        <div className="relative">
          <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user?.full_name || user?.email}</span>
          </button>
          {showDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 py-1">
                <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => setShowDropdown(false)}>
                  Settings
                </Link>
                <hr className="my-1 border-gray-100 dark:border-gray-700" />
                <button onClick={handleSignOut} className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmSignOut}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign Out"
        variant="danger"
      />
    </header>
  )
}
