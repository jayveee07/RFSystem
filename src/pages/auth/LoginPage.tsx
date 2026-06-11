import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { authApi, getAuthErrorMessage } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useTheme } from '../../lib/theme'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export function LoginPage() {
  const { user, loading: authLoading } = useAuth()
  const { mode, toggle } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (authLoading) return null
  if (user) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.signIn(email, password)
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <button
        onClick={toggle}
        className="absolute top-6 right-6 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
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
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/Logo_FRS.png" alt="FRS" className="w-14 h-14 rounded-xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financial Reconciliation System</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Sign in to your account</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
            {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">{error}</p>}
            <Button type="submit" loading={loading} className="w-full">Sign In</Button>
          </form>
          <div className="mt-6 text-center space-y-2">
            <Link to="/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">Forgot password?</Link>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Don't have an account? <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
