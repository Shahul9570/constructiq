import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sliders, Shield, AlertTriangle, Bot, Box, Save, CheckCircle2, Megaphone, HardDrive } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'
import { adminService, PlatformSettings } from '@/services/admin.service'

export default function PlatformSettingsPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<Partial<PlatformSettings>>({})

  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ['admin-platform-settings'],
    queryFn: () => adminService.getPlatformSettings(),
  })

  useEffect(() => {
    if (settings) {
      setForm(settings)
    }
  }, [settings])

  const mutation = useMutation({
    mutationFn: (data: Partial<PlatformSettings>) => adminService.updatePlatformSettings(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-platform-settings'], updated)
      toast.success('Platform control settings updated successfully')
    },
    onError: () => {
      toast.error('Failed to update platform settings')
    },
  })

  const handleToggle = (key: keyof PlatformSettings) => {
    setForm((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = () => {
    mutation.mutate(form)
  }

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4" />
        Loading global platform configuration...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-red-400 bg-red-950/20 rounded-xl border border-red-900/50">
        Failed to fetch platform configuration settings.
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Sliders className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Platform Controls & Settings</h1>
              <p className="text-slate-400 mt-1 text-sm">Owner-level feature toggles, maintenance mode, and system parameters.</p>
            </div>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={mutation.isPending}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-lg shadow-orange-950/50"
        >
          <Save className="h-4 w-4 mr-2" />
          {mutation.isPending ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      {/* Global Announcement Banner */}
      <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-amber-400" />
            Global Platform Announcement Banner
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Display an emergency broadcast message across all user dashboards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="e.g. Scheduled database maintenance tonight at 02:00 UTC."
            value={form.announcement_banner || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, announcement_banner: e.target.value }))}
            className="bg-slate-950/60 border-slate-800 focus-visible:ring-orange-500 text-slate-200"
          />
        </CardContent>
      </Card>

      {/* Master Feature Toggles */}
      <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-400" />
            Master Feature Switches & Access Control
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Enable or disable major modules across the entire SaaS instance.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-slate-800/60">
          {/* Maintenance Mode */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-white">System Maintenance Mode</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Restricts platform access to Super Admin users only while upgrades are underway.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('maintenance_mode')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.maintenance_mode ? 'bg-red-500' : 'bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.maintenance_mode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* AI Assistant */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Bot className="h-5 w-5 text-purple-400 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-white">AI Construction Assistant & Risk Engine</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Enable OpenAI-powered site analytics, predictive risk detection, and natural language Q&A.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('enable_ai_assistant')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.enable_ai_assistant ? 'bg-orange-500' : 'bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.enable_ai_assistant ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 3D Visualizer */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Box className="h-5 w-5 text-blue-400 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-white">3D Digital Twin GLB Visualizer</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Allow project teams to upload and interact with 3D building models and spatial issue pins.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('enable_3d_visualizer')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.enable_3d_visualizer ? 'bg-orange-500' : 'bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.enable_3d_visualizer ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Require 2FA */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-white">Enforce Two-Factor Authentication (2FA)</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Mandate 2FA verification for all Company Owners and Admins upon login.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('require_2fa')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.require_2fa ? 'bg-emerald-500' : 'bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.require_2fa ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Resource Quotas */}
      <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-amber-400" />
            Global Platform Resource Quotas
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Set maximum file upload thresholds and AI token limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Max Document Upload Limit (MB)</label>
            <Input
              type="number"
              value={form.max_file_upload_mb || 50}
              onChange={(e) => setForm((prev) => ({ ...prev, max_file_upload_mb: Number(e.target.value) }))}
              className="bg-slate-950/60 border-slate-800 focus-visible:ring-orange-500 text-slate-200"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Monthly AI Token Quota Limit</label>
            <Input
              type="number"
              value={form.ai_monthly_token_limit || 500000}
              onChange={(e) => setForm((prev) => ({ ...prev, ai_monthly_token_limit: Number(e.target.value) }))}
              className="bg-slate-950/60 border-slate-800 focus-visible:ring-orange-500 text-slate-200"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
