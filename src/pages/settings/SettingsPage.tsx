import { useState, useEffect } from 'react'
import { updatePassword } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import toast from 'react-hot-toast'

export function SettingsPage() {
  const [profile, setProfile] = useState({ full_name: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })

  useEffect(() => {
    const u = auth.currentUser
    if (u) {
      getDoc(doc(db, 'users', u.uid)).then((snap) => {
        if (snap.exists()) {
          const d = snap.data()
          setProfile({ full_name: d.full_name || '', phone: d.phone || '' })
        }
      })
    }
  }, [])

  const updateProfile = async () => {
    setLoading(true)
    try {
      const u = auth.currentUser
      if (u) {
        await updateDoc(doc(db, 'users', u.uid), { full_name: profile.full_name, phone: profile.phone })
        toast.success('Profile updated')
      }
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const updatePasswordAction = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (!auth.currentUser) return
    setLoading(true)
    try {
      await updatePassword(auth.currentUser, passwordForm.new)
      toast.success('Password updated')
      setPasswordForm({ current: '', new: '', confirm: '' })
    } catch {
      toast.error('Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your profile and system configuration</p>
      </div>

      <Card title="Profile" subtitle="Update your personal information">
        <div className="space-y-4 max-w-md">
          <Input label="Full Name" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          <Input label="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          <Button onClick={updateProfile} loading={loading}>Save Changes</Button>
        </div>
      </Card>

      <Card title="Security" subtitle="Update your password and security settings">
        <div className="space-y-4 max-w-md">
          <Select
            label="Multi-Factor Authentication"
            options={[{ value: 'false', label: 'Disabled' }, { value: 'true', label: 'Enabled' }]}
            value="false"
            onChange={() => {}}
          />
          <hr className="border-gray-100" />
          <h4 className="font-medium text-gray-900">Change Password</h4>
          <Input label="Current Password" type="password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} />
          <Input label="New Password" type="password" value={passwordForm.new} onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })} />
          <Input label="Confirm New Password" type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
          <Button onClick={updatePasswordAction} loading={loading}>Update Password</Button>
        </div>
      </Card>

      <Card title="System Configuration" subtitle="Integration and compliance settings">
        <div className="space-y-4 max-w-md">
          <Select
            label="Compliance Standard"
            options={[
              { value: 'ifrs', label: 'IFRS' },
              { value: 'gaap', label: 'GAAP' },
              { value: 'sox', label: 'SOX' },
            ]}
            value="ifrs"
            onChange={() => {}}
          />
          <Select
            label="Data Retention (months)"
            options={[
              { value: '12', label: '12 Months' },
              { value: '36', label: '36 Months' },
              { value: '60', label: '60 Months' },
              { value: '0', label: 'Indefinite' },
            ]}
            value="36"
            onChange={() => {}}
          />
          <Button variant="secondary">Save Configuration</Button>
        </div>
      </Card>
    </div>
  )
}
