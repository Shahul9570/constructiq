import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Check, Zap, ShieldCheck, FolderKanban, Users, HardDrive, Bot, ArrowRight, Download, Sparkles, Building } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'
import { subscriptionService, CompanySubscription } from '@/services/subscription.service'

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

  const plans = [
    {
      id: 'starter',
      name: 'Starter Tier',
      tagline: 'Ideal for small sub-contractors & single site projects.',
      priceMonthly: 199,
      priceAnnual: 1990,
      features: [
        'Up to 2 Active Projects',
        '10 Registered Workforce Seats',
        '25 GB Secure Document Storage',
        '100k Monthly AI Tokens',
        'Standard PDF Report Exports',
      ],
      highlight: false,
    },
    {
      id: 'professional',
      name: 'Professional Tier',
      tagline: 'Best for growing construction firms & mid-sized teams.',
      priceMonthly: 499,
      priceAnnual: 4990,
      features: [
        'Up to 10 Active Projects',
        '50 Registered Workforce Seats',
        '250 GB Storage + 3D Visualizer',
        '500k Monthly AI Tokens',
        'Weather Delay & Site Diary Tracker',
        'Interactive 3D Digital Twin GLB',
        'Priority Phone & Chat Support',
      ],
      highlight: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise Tier',
      tagline: 'Unlimited scale for large construction enterprises & EPCs.',
      priceMonthly: 999,
      priceAnnual: 9990,
      features: [
        'Unlimited Active Projects',
        'Unlimited Workforce Seats',
        '1 TB Storage + Custom S3 Bucket',
        '2M Monthly AI Tokens',
        'Full 3D GLB & IFC BIM Parser',
        'Dedicated Account Manager & SLA',
        'Custom SSO & 2FA Governance',
      ],
      highlight: false,
    },
  ]

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">SaaS Subscription & Plan Management</h1>
              <p className="text-slate-400 mt-1 text-sm">Tenant plan tiers, resource allocation gauges, and renewal invoices.</p>
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
            Annual Billing <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold">Save 17%</span>
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

      {/* Plan Tiers Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isCurrent = sub.plan_tier === p.id
          const price = billingCycle === 'annual' ? p.priceAnnual : p.priceMonthly

          return (
            <Card
              key={p.id}
              className={`bg-slate-900/40 border-slate-800/80 backdrop-blur-xl flex flex-col justify-between relative transition-all duration-200 ${
                p.highlight ? 'border-orange-500/50 ring-1 ring-orange-500/30 shadow-2xl shadow-orange-950/30' : ''
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-lg tracking-widest flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Most Popular
                </div>
              )}

              <CardHeader className="pt-6">
                <CardTitle className="text-xl font-bold text-white flex items-center justify-between">
                  {p.name}
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs mt-1 min-h-[36px]">
                  {p.tagline}
                </CardDescription>
                <div className="pt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">${price}</span>
                  <span className="text-xs text-slate-400">/ {billingCycle === 'annual' ? 'yr' : 'mo'}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 flex-1">
                <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                  {p.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-slate-300">
                      <div className="p-0.5 rounded-full bg-orange-500/10 text-orange-400 shrink-0">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <div className="p-6 pt-0">
                <Button
                  onClick={() => handleUpgrade(p.id)}
                  disabled={isCurrent || upgradeMutation.isPending}
                  className={`w-full font-semibold transition-all ${
                    isCurrent
                      ? 'bg-slate-800 text-slate-400 border border-slate-700/60 cursor-default'
                      : p.highlight
                      ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-950/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60'
                  }`}
                >
                  {isCurrent ? 'Current Active Tier' : 'Upgrade to ' + p.name.split(' ')[0]}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
