import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { onAuthStateChanged } from 'firebase/auth'
import { notificationsApi } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { auth } from '../../lib/firebase'
import toast from 'react-hot-toast'
import type { Notification } from '../../types'

const typeVariant: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  reconciliation_completed: 'success',
  new_exception: 'danger',
  approval_required: 'warning',
  import_failed: 'danger',
  match_found: 'info',
  report_ready: 'success',
  system: 'info',
}

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid)
    })
    return () => unsub()
  }, [])

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => notificationsApi.list(userId),
    enabled: !!userId,
    refetchInterval: 10000,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('All notifications marked as read')
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notifications</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Stay informed about reconciliation events</p>
        </div>
        <Button variant="secondary" onClick={() => markAllReadMutation.mutate()} loading={markAllReadMutation.isPending}>
          Mark All as Read
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`flex items-start gap-4 p-4 rounded-lg transition-colors cursor-pointer ${
                  notif.is_read ? 'bg-white dark:bg-gray-900' : 'bg-blue-50 dark:bg-blue-950/30'
                } hover:bg-gray-50 dark:hover:bg-gray-800`}
                onClick={() => { if (!notif.is_read) markReadMutation.mutate(notif.id) }}
              >
                <Badge variant={typeVariant[notif.type]}>{notif.type.replace(/_/g, ' ')}</Badge>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${notif.is_read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-gray-100 font-medium'}`}>{notif.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notif.message}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(notif.created_at).toLocaleDateString()}</span>
                  {!notif.is_read && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
          </div>
        )}
      </Card>
    </div>
  )
}
