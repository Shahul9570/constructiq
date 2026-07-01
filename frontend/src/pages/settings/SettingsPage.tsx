import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { authService } from '@/services/auth.service'
import { useAuth } from '@/hooks/useAuth'
import {
  Settings,
  User,
  Lock,
  Moon,
  Sun,
  Save,
  Loader2,
  Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'

export default function SettingsPage() {
  const { user, updateUser } = useAuth()

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '',
  })

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return false
  })

  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
      })
    }
  }, [user])

  const toggleTheme = () => {
    const newDark = !isDark
    setIsDark(newDark)
    document.documentElement.classList.toggle('dark', newDark)
    localStorage.setItem('theme', newDark ? 'dark' : 'light')
  }

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/auth/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(profileForm),
      })
      if (!response.ok) throw new Error('Failed to update profile')
      return response.json()
    },
    onSuccess: (data) => {
      updateUser(data)
      toast.success('Profile updated successfully')
    },
    onError: () => toast.error('Failed to update profile'),
  })

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      authService.changePassword(passwordForm.current_password, passwordForm.new_password),
    onSuccess: () => {
      toast.success('Password changed successfully')
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
    },
    onError: () => toast.error('Failed to change password'),
  })

  const wipeDataMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete('/auth/system/wipe-mock-data')
      return response.data
    },
    onSuccess: () => toast.success('Mock data wiped successfully. Please refresh the page.'),
    onError: () => toast.error('Failed to wipe mock data. Ensure you have Owner privileges.'),
  })

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfileMutation.mutate()
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Passwords do not match')
      return
    }
    if (passwordForm.new_password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    changePasswordMutation.mutate()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      {/* Company Code display for Company Owners */}
      {user?.role === 'company_owner' && (user as any).company_code && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Settings className="h-5 w-5" />
              Your Company Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Share this code with your team (Site Engineers, Accountants, etc.) so they can register under your company.
            </p>
            <div className="flex items-center gap-3">
              <code className="text-2xl font-bold tracking-widest bg-background border rounded-lg px-6 py-3 select-all">
                {(user as any).company_code}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText((user as any).company_code)
                  import('react-hot-toast').then(t => t.default.success('Company code copied!'))
                }}
                className="text-sm text-primary hover:underline"
              >
                Copy
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="settings-name">Full Name</Label>
              <Input
                id="settings-name"
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-email">Email</Label>
              <Input
                id="settings-email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-phone">Phone</Label>
              <Input
                id="settings-phone"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="settings-current-pw">Current Password</Label>
              <Input
                id="settings-current-pw"
                type="password"
                required
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-new-pw">New Password</Label>
              <Input
                id="settings-new-pw"
                type="password"
                required
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-confirm-pw">Confirm New Password</Label>
              <Input
                id="settings-confirm-pw"
                type="password"
                required
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">
                Toggle between light and dark mode
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {isDark ? 'Dark' : 'Light'}
              </span>
              <Switch checked={isDark} onCheckedChange={toggleTheme} />
            </div>
          </div>
        </CardContent>
      </Card>

      {user?.role === 'owner' && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-destructive">Wipe Mock Data</p>
                <p className="text-sm text-muted-foreground">
                  Permanently deletes all projects, invoices, materials, and equipment. User accounts remain active.
                </p>
              </div>
              <Button 
                variant="destructive" 
                disabled={wipeDataMutation.isPending}
                onClick={() => {
                  if (window.confirm("Are you SURE you want to wipe all database records? This cannot be undone!")) {
                    wipeDataMutation.mutate()
                  }
                }}
              >
                {wipeDataMutation.isPending ? 'Wiping...' : 'Clear Database'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
