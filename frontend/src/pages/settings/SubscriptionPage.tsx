import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Check, X, ShieldCheck, FolderKanban, Users, HardDrive, Bot, Sparkles, Building, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'
import { subscriptionService } from '@/services/subscription.service'

export default function SubscriptionPage() {
  const queryClient = useQueryClient()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const { data: sub, isLoading, isError } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => subscriptionService.getMySubscription(),
  })

  const upgradeMutation = useMutation({
    mutationFn: ({ tier, cycle }: { tier: string; cycle: string }) =>
      subscriptionService.upgradePlan(tier, cycle),
    onSuccess: (updated) => {
      queryClient.setQueryData(['my-subscription'], updated)
      toast.success(`Plan upgraded to ${updated.plan_tier.toUpperCase()}!`)
    },
    onError: () => {
      toast.error('Failed to upgrade subscription tier.')
    }
  })

  const handleUpgrade = (tier: string) => {
    upgradeMutation.mutate({ tier, cycle: billingCycle })
  }

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4" />
        Loading tenant subscription details...
      </div>
    )
  }

  if (isError || !sub) {
    return (
      <div className="p-8 text-center text-red-400 bg-red-950/20 rounded-xl border border-red-900/50">
        Failed to fetch company subscription. Please try refreshing.
      </div>
    )
  }

  const usage = sub.usage

  const comparisonRows = [
    {
      feature: 'Monthly Price',
      free: '$0',
      starter: billingCycle === 'annual' ? '$49' : '$59',
      pro: billingCycle === 'annual' ? '$199' : '$249',
      enterprise: 'Custom ($999+)',
      isHighlight: true,
    },
    {
      feature: 'Projects',
      free: '1',
      starter: '5',
      pro: '25',
      enterprise: 'Unlimited',
    },
    {
      feature: 'Users',
      free: '5',
      starter: '20',
      pro: '100',
      enterprise: 'Unlimited',
    },
    {
      feature: 'Daily Logs',
      free: true,
      starter: true,
      pro: true,
      enterprise: true,
    },
    {
      feature: 'Tasks',
      free: true,
      starter: true,
      pro: true,
      enterprise: true,
    },
    {
      feature: 'Materials',
      free: true,
      starter: true,
      pro: true,
      enterprise: true,
    },
    {
      feature: 'Equipment',
      free: true,
      starter: true,
      pro: true,
      enterprise: true,
    },
    {
      feature: 'Financials',
      free: 'basic',
      starter: true,
      pro: true,
      enterprise: true,
    },
    {
      feature: 'AI Reports',
      free: 'Limited',
      starter: true,
      pro: true,
      enterprise: true,
    },
    {
      feature: 'Digital Twin',
      free: 'Viewer',
      starter: 'GLB Live',
      pro: 'GLB + Timeline + AI',
      enterprise: 'IFC/BIM + Enterprise',
    },
    {
      feature: 'Client Portal',
      free: false,
      starter: true,
      pro: true,
      enterprise: true,
    },
    {
      feature: 'API Access',
      free: false,
      starter: false,
      pro: 'Limited',
      enterprise: 'Full',
    },
    {
      feature: 'SSO',
      free: false,
      starter: false,
      pro: false,
      enterprise: true,
    },
    {
      feature: 'Support',
      free: 'Community',
      starter: 'Email',
      pro: 'Priority',
      enterprise: 'Dedicated',
    },
  ]

  const renderCellContent = (value: any) => {
    if (value === true) {
      return (
        <span className="inline-flex items-center justify-center p-1 rounded-md bg-emerald-500/20 text-emerald-400">
          <Check className="h-4 w-4" />
        </span>
      )
    }
    if (value === false) {
      return (
        <span className="inline-flex items-center justify-center p-1 text-slate-600">
          <X className="h-4 w-4" />
        </span>
      )
    }
    if (value === 'basic') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
          <Eye className="h-3 w-3" /> Basic
        </span>
      )
    }
    return <span className="text-xs font-medium text-slate-200">{value}</span>
  }

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">SaaS Subscription & Plan Matrix</h1>
              <p className="text-slate-400 mt-1 text-sm">Feature comparisons, tenant tier allocations, and live resource usage gauges.</p>
            </div>
          </div>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              billingCycle === 'monthly' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              billingCycle === 'annual' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Annual Billing <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Active Subscription Overview Card */}
      <Card className="bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/90 border-slate-800/80 backdrop-blur-xl shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-widest flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5" />
                  {sub.company_name}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Active Plan
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-white capitalize">{sub.plan_tier} Tier Package</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Billed {sub.billing_cycle} at <strong className="text-white">${sub.amount_paid}</strong> / period. Renews on {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'N/A'}.
                </p>
              </div>
            </div>
          </div>

          {/* Usage Gauges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
            {/* Projects Gauge */}
            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400"><FolderKanban className="h-4 w-4 text-orange-400" /> Active Projects</span>
                <span className="text-white font-mono">{usage.used_projects} / {usage.max_projects}</span>
              </div>
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((usage.used_projects / usage.max_projects) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Workers Gauge */}
            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400"><Users className="h-4 w-4 text-amber-400" /> Worker Seats</span>
                <span className="text-white font-mono">{usage.used_workers} / {usage.max_workers}</span>
              </div>
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((usage.used_workers / usage.max_workers) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Storage Gauge */}
            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400"><HardDrive className="h-4 w-4 text-blue-400" /> Storage Usage</span>
                <span className="text-white font-mono">{usage.used_storage_gb} / {usage.max_storage_gb} GB</span>
              </div>
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((usage.used_storage_gb / usage.max_storage_gb) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* AI Token Gauge */}
            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400"><Bot className="h-4 w-4 text-purple-400" /> AI Tokens</span>
                <span className="text-white font-mono">{(usage.ai_tokens_used / 1000).toFixed(1)}k / {(usage.ai_tokens_limit / 1000).toFixed(0)}k</span>
              </div>
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((usage.ai_tokens_used / usage.ai_tokens_limit) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sleek Feature Comparison Table Matrix */}
      <Card className="bg-slate-950/90 border-slate-800/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        <CardHeader className="p-6 pb-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <CardTitle className="text-xl font-extrabold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-400" /> Plan Feature Comparison Matrix
            </CardTitle>
            <p className="text-slate-400 text-xs mt-1">Detailed feature breakdown across Free, Starter, Professional, and Enterprise plans.</p>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60">
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider w-1/5">Feature</th>
                <th className="p-4 text-center text-xs font-bold text-slate-200 w-1/5">
                  <div className="flex items-center justify-center gap-1.5">
                    <span>🆓 Free</span>
                  </div>
                </th>
                <th className="p-4 text-center text-xs font-bold text-amber-400 w-1/5">
                  <div className="flex items-center justify-center gap-1.5">
                    <span>⚡ Starter</span>
                  </div>
                </th>
                <th className="p-4 text-center text-xs font-bold text-orange-400 bg-orange-500/10 border-x border-orange-500/20 relative w-1/5">
                  <div className="flex items-center justify-center gap-1.5">
                    <span>🚀 Professional</span>
                    <span className="text-[9px] bg-orange-500 text-white px-1.5 py-0.2 rounded-full uppercase tracking-tighter">Popular</span>
                  </div>
                </th>
                <th className="p-4 text-center text-xs font-bold text-purple-400 w-1/5">
                  <div className="flex items-center justify-center gap-1.5">
                    <span>🏢 Enterprise</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {comparisonRows.map((row, idx) => (
                <tr key={idx} className={`hover:bg-slate-900/40 transition-colors ${row.isHighlight ? 'bg-slate-900/30 font-bold' : ''}`}>
                  <td className="p-4 text-xs font-semibold text-slate-300 border-r border-slate-800/60">{row.feature}</td>
                  <td className="p-4 text-center border-r border-slate-800/60">{renderCellContent(row.free)}</td>
                  <td className="p-4 text-center border-r border-slate-800/60">{renderCellContent(row.starter)}</td>
                  <td className="p-4 text-center border-r border-orange-500/20 bg-orange-500/5">{renderCellContent(row.pro)}</td>
                  <td className="p-4 text-center">{renderCellContent(row.enterprise)}</td>
                </tr>
              ))}
              
              {/* Action Buttons Row */}
              <tr className="bg-slate-900/80">
                <td className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Select Tier</td>
                <td className="p-4 text-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpgrade('free')}
                    disabled={sub.plan_tier === 'free' || upgradeMutation.isPending}
                    className="w-full text-xs font-semibold bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                  >
                    {sub.plan_tier === 'free' ? 'Active' : 'Select Free'}
                  </Button>
                </td>
                <td className="p-4 text-center">
                  <Button
                    size="sm"
                    onClick={() => handleUpgrade('starter')}
                    disabled={sub.plan_tier === 'starter' || upgradeMutation.isPending}
                    className="w-full text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow"
                  >
                    {sub.plan_tier === 'starter' ? 'Active' : 'Upgrade $59'}
                  </Button>
                </td>
                <td className="p-4 text-center bg-orange-500/10 border-x border-orange-500/20">
                  <Button
                    size="sm"
                    onClick={() => handleUpgrade('professional')}
                    disabled={sub.plan_tier === 'professional' || upgradeMutation.isPending}
                    className="w-full text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-950/50"
                  >
                    {sub.plan_tier === 'professional' ? 'Active' : 'Upgrade $249'}
                  </Button>
                </td>
                <td className="p-4 text-center">
                  <Button
                    size="sm"
                    onClick={() => handleUpgrade('enterprise')}
                    disabled={sub.plan_tier === 'enterprise' || upgradeMutation.isPending}
                    className="w-full text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow"
                  >
                    {sub.plan_tier === 'enterprise' ? 'Active' : 'Upgrade Custom'}
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
