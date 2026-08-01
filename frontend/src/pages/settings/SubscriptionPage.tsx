import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Check, X, ShieldCheck, FolderKanban, Users, HardDrive, Bot, Sparkles, Building, Eye, FileText, Download, Receipt, Settings2, Sliders, DollarSign, Activity, Crown, Edit3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { subscriptionService, PaymentReceipt } from '@/services/subscription.service'
import PaymentCheckoutModal from '@/components/subscription/PaymentCheckoutModal'
import PaymentSuccessModal from '@/components/subscription/PaymentSuccessModal'

export default function SubscriptionPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.role === 'super_admin'

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  // Modals state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [checkoutTier, setCheckoutTier] = useState('starter')
  const [checkoutPrice, setCheckoutPrice] = useState(59)
  
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [lastReceipt, setLastReceipt] = useState<PaymentReceipt | null>(null)

  // Admin Override Modal State
  const [isAdminOverrideOpen, setIsAdminOverrideOpen] = useState(false)
  const [selectedSubForOverride, setSelectedSubForOverride] = useState<any>(null)
  const [overrideForm, setOverrideForm] = useState({
    subscription_id: 0,
    plan_tier: 'professional',
    billing_cycle: 'monthly',
    status: 'active',
    max_projects: 25,
    max_workers: 100,
    max_storage_gb: 250,
    amount_paid: 249,
  })

  // Admin Plan Matrix Editor Modal State
  const [isAdminMatrixOpen, setIsAdminMatrixOpen] = useState(false)
  const [matrixForm, setMatrixForm] = useState({
    plan_tier: 'starter',
    monthly_price: 59,
    annual_price: 590,
    max_projects: 5,
    max_workers: 20,
    max_storage_gb: 50,
    site_diary: false,
    client_portal: true,
    api_access: false,
  })

  const { data: sub, isLoading, isError } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => subscriptionService.getMySubscription(),
  })

  const { data: receipts = [] } = useQuery({
    queryKey: ['payment-receipts'],
    queryFn: () => subscriptionService.getReceipts(),
  })

  // Super Admin All Subscriptions & MRR Query
  const { data: adminData } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: () => subscriptionService.getAdminMRR(),
    enabled: isAdmin,
  })

  const overrideMutation = useMutation({
    mutationFn: (data: any) => subscriptionService.overrideSubscription(data),
    onSuccess: (res) => {
      toast.success(res.message || 'Subscription overridden successfully!')
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
      setIsAdminOverrideOpen(false)
    },
    onError: () => {
      toast.error('Failed to override company subscription.')
    }
  })

  const matrixMutation = useMutation({
    mutationFn: (data: any) => subscriptionService.updatePlanConfig(data),
    onSuccess: (res) => {
      toast.success(res.message || 'Plan definitions updated!')
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
      setIsAdminMatrixOpen(false)
    },
    onError: () => {
      toast.error('Failed to update plan matrix definitions.')
    }
  })

  const handleOpenCheckout = (tier: string, priceMonthly: number, priceAnnual: number) => {
    if (tier === 'free' || priceMonthly === 0) {
      subscriptionService.upgradePlan('free', billingCycle).then((updated) => {
        queryClient.setQueryData(['my-subscription'], updated)
        toast.success('Switched to Free Trial tier.')
      })
      return
    }

    const finalPrice = billingCycle === 'annual' ? priceAnnual : priceMonthly
    setCheckoutTier(tier)
    setCheckoutPrice(finalPrice)
    setIsCheckoutOpen(true)
  }

  const handleCheckoutSuccess = (receipt: PaymentReceipt) => {
    queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
    queryClient.invalidateQueries({ queryKey: ['payment-receipts'] })
    setLastReceipt(receipt)
    setIsSuccessOpen(true)
  }

  const handleOpenAdminOverride = (targetSub: any) => {
    setSelectedSubForOverride(targetSub)
    setOverrideForm({
      subscription_id: targetSub.id,
      plan_tier: targetSub.plan_tier,
      billing_cycle: targetSub.billing_cycle || 'monthly',
      status: targetSub.status || 'active',
      max_projects: targetSub.max_projects || 25,
      max_workers: targetSub.max_workers || 100,
      max_storage_gb: targetSub.max_storage_gb || 250,
      amount_paid: targetSub.amount_paid || 0,
    })
    setIsAdminOverrideOpen(true)
  }

  const handleAdminOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    overrideMutation.mutate(overrideForm)
  }

  const handleAdminMatrixSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    matrixMutation.mutate(matrixForm)
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
      {/* Super Admin Exempt Banner */}
      {isAdmin && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-950 border border-purple-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Super Admin Operating Mode Unlocked
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                You are logged in as Platform Operator. Subscriptions apply to customer company accounts. You have unrestricted access to all features, projects, and analytics.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAdminMatrixOpen(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow shrink-0"
          >
            <Edit3 className="h-3.5 w-3.5 mr-1.5" /> Edit Plan Matrix Definitions
          </Button>
        </div>
      )}

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

      {/* SUPER ADMIN SUBSCRIPTION GOVERNANCE HUB */}
      {isAdmin && adminData && (
        <Card className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-orange-500/30 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <CardHeader className="p-6 border-b border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                    Super Admin SaaS Governance Hub
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs mt-0.5">
                    Platform Monthly Recurring Revenue (MRR), subscriber analytics, and instant plan override controls.
                  </CardDescription>
                </div>
              </div>

              {/* Revenue Stats Badges */}
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Monthly MRR</p>
                  <p className="text-xl font-extrabold text-emerald-400 font-mono">${adminData.mrr.toFixed(2)}</p>
                </div>
                <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Annual ARR</p>
                  <p className="text-xl font-extrabold text-orange-400 font-mono">${adminData.arr.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Global Tenant Subscriptions Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 uppercase font-semibold">
                    <th className="p-4">Company & Owner</th>
                    <th className="p-4">Active Plan</th>
                    <th className="p-4">Quotas (Proj / Seats / Storage)</th>
                    <th className="p-4 text-right">Amount Paid</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Admin Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {adminData.subscriptions.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-900/80 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-white">{s.company_name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{s.owner_email || 'Owner ID: ' + s.owner_id}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                          s.plan_tier === 'enterprise' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                          s.plan_tier === 'professional' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                          s.plan_tier === 'starter' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {s.plan_tier} ({s.billing_cycle || 'mo'})
                        </span>
                      </td>
                      <td className="p-4 font-mono text-slate-300">
                        {s.max_projects || 25} Projects | {s.max_workers || 100} Seats | {s.max_storage_gb || 250} GB
                      </td>
                      <td className="p-4 text-right font-bold text-white font-mono">
                        ${(s.amount_paid || 0).toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                          {s.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          size="sm"
                          onClick={() => handleOpenAdminOverride(s)}
                          className="h-8 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow"
                        >
                          <Sliders className="h-3.5 w-3.5 mr-1" /> Grant / Edit Plan
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

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
                <span className="text-white font-mono font-bold">{(usage.ai_tokens_used / 1000).toFixed(1)}k / {(usage.ai_tokens_limit / 1000).toFixed(0)}k</span>
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
                    onClick={() => handleOpenCheckout('free', 0, 0)}
                    disabled={sub.plan_tier === 'free'}
                    className="w-full text-xs font-semibold bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                  >
                    {sub.plan_tier === 'free' ? 'Active' : 'Select Free'}
                  </Button>
                </td>
                <td className="p-4 text-center">
                  <Button
                    size="sm"
                    onClick={() => handleOpenCheckout('starter', 59, 590)}
                    disabled={sub.plan_tier === 'starter'}
                    className="w-full text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow"
                  >
                    {sub.plan_tier === 'starter' ? 'Active' : 'Upgrade $59'}
                  </Button>
                </td>
                <td className="p-4 text-center bg-orange-500/10 border-x border-orange-500/20">
                  <Button
                    size="sm"
                    onClick={() => handleOpenCheckout('professional', 249, 2490)}
                    disabled={sub.plan_tier === 'professional'}
                    className="w-full text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-950/50"
                  >
                    {sub.plan_tier === 'professional' ? 'Active' : 'Upgrade $249'}
                  </Button>
                </td>
                <td className="p-4 text-center">
                  <Button
                    size="sm"
                    onClick={() => handleOpenCheckout('enterprise', 999, 9990)}
                    disabled={sub.plan_tier === 'enterprise'}
                    className="w-full text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow"
                  >
                    {sub.plan_tier === 'enterprise' ? 'Active' : 'Upgrade $999'}
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Subscription Payment Receipts & Invoices Table */}
      <Card className="bg-slate-950/90 border-slate-800/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        <CardHeader className="p-6 pb-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <CardTitle className="text-xl font-extrabold text-white flex items-center gap-2">
              <Receipt className="h-5 w-5 text-orange-400" /> Subscription Billing History & Receipts
            </CardTitle>
            <p className="text-slate-400 text-xs mt-1">Download official tax invoices and transaction verification receipts.</p>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {receipts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No subscription payment receipts found yet. Upgrade your plan above to generate receipts.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase font-semibold">
                    <th className="p-4">Transaction ID</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Plan Tier</th>
                    <th className="p-4">Payment Method</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {receipts.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-900/40 font-mono">
                      <td className="p-4 font-bold text-white">{r.transaction_id}</td>
                      <td className="p-4 text-slate-400">{new Date(r.payment_date).toLocaleDateString()}</td>
                      <td className="p-4 capitalize font-semibold text-orange-400">{r.plan_tier} ({r.billing_cycle})</td>
                      <td className="p-4 capitalize text-slate-300">{r.payment_method.replace('_', ' ')} (•••• {r.card_last4 || '4242'})</td>
                      <td className="p-4 text-right font-extrabold text-white">${r.total_amount.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                          {r.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setLastReceipt(r)
                            setIsSuccessOpen(true)
                          }}
                          className="h-7 text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" /> View Receipt
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checkout & Confirmation Modals */}
      <PaymentCheckoutModal
        open={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        planTier={checkoutTier}
        billingCycle={billingCycle}
        price={checkoutPrice}
        onSuccess={handleCheckoutSuccess}
      />

      <PaymentSuccessModal
        open={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        receipt={lastReceipt}
      />

      {/* Super Admin Plan Override Modal */}
      {isAdmin && selectedSubForOverride && (
        <Dialog open={isAdminOverrideOpen} onOpenChange={setIsAdminOverrideOpen}>
          <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 sm:max-w-lg p-6 space-y-4 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-orange-400" /> Super Admin Subscription Override
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Grant custom plan access or override resource quotas for <strong className="text-white">{selectedSubForOverride.company_name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAdminOverrideSubmit} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Target Plan Tier</Label>
                  <Select
                    value={overrideForm.plan_tier}
                    onValueChange={(val) => setOverrideForm(f => ({ ...f, plan_tier: val }))}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-800 text-xs text-slate-200">
                      <SelectValue placeholder="Select Plan" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                      <SelectItem value="free">Free Trial</SelectItem>
                      <SelectItem value="starter">Starter Tier ($59)</SelectItem>
                      <SelectItem value="professional">Professional Tier ($249)</SelectItem>
                      <SelectItem value="enterprise">Enterprise Tier ($999+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Subscription Status</Label>
                  <Select
                    value={overrideForm.status}
                    onValueChange={(val) => setOverrideForm(f => ({ ...f, status: val }))}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-800 text-xs text-slate-200">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                      <SelectItem value="active">Active (Complimentary/Paid)</SelectItem>
                      <SelectItem value="trialing">Trialing</SelectItem>
                      <SelectItem value="past_due">Past Due</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Max Projects</Label>
                  <Input
                    type="number"
                    value={overrideForm.max_projects}
                    onChange={(e) => setOverrideForm(f => ({ ...f, max_projects: Number(e.target.value) }))}
                    className="bg-slate-900 border-slate-800 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Max Worker Seats</Label>
                  <Input
                    type="number"
                    value={overrideForm.max_workers}
                    onChange={(e) => setOverrideForm(f => ({ ...f, max_workers: Number(e.target.value) }))}
                    className="bg-slate-900 border-slate-800 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Storage (GB)</Label>
                  <Input
                    type="number"
                    value={overrideForm.max_storage_gb}
                    onChange={(e) => setOverrideForm(f => ({ ...f, max_storage_gb: Number(e.target.value) }))}
                    className="bg-slate-900 border-slate-800 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAdminOverrideOpen(false)}
                  className="bg-slate-900 border-slate-800 text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={overrideMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
                >
                  {overrideMutation.isPending ? 'Saving Override...' : 'Apply Plan Override'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Super Admin Plan Matrix Definitions Editor Modal */}
      {isAdmin && (
        <Dialog open={isAdminMatrixOpen} onOpenChange={setIsAdminMatrixOpen}>
          <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 sm:max-w-lg p-6 space-y-4 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-purple-400" /> Plan Definitions & Matrix Editor
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Dynamically adjust pricing, quota caps, and feature permissions for any plan tier across the platform.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAdminMatrixSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Target Tier to Edit</Label>
                <Select
                  value={matrixForm.plan_tier}
                  onValueChange={(val) => setMatrixForm(f => ({ ...f, plan_tier: val }))}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-800 text-xs text-slate-200">
                    <SelectValue placeholder="Select Tier" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="free">Free Tier</SelectItem>
                    <SelectItem value="starter">Starter Tier</SelectItem>
                    <SelectItem value="professional">Professional Tier</SelectItem>
                    <SelectItem value="enterprise">Enterprise Tier</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Monthly Price ($)</Label>
                  <Input
                    type="number"
                    value={matrixForm.monthly_price}
                    onChange={(e) => setMatrixForm(f => ({ ...f, monthly_price: Number(e.target.value) }))}
                    className="bg-slate-900 border-slate-800 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Annual Price ($)</Label>
                  <Input
                    type="number"
                    value={matrixForm.annual_price}
                    onChange={(e) => setMatrixForm(f => ({ ...f, annual_price: Number(e.target.value) }))}
                    className="bg-slate-900 border-slate-800 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Max Projects</Label>
                  <Input
                    type="number"
                    value={matrixForm.max_projects}
                    onChange={(e) => setMatrixForm(f => ({ ...f, max_projects: Number(e.target.value) }))}
                    className="bg-slate-900 border-slate-800 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Max Seats</Label>
                  <Input
                    type="number"
                    value={matrixForm.max_workers}
                    onChange={(e) => setMatrixForm(f => ({ ...f, max_workers: Number(e.target.value) }))}
                    className="bg-slate-900 border-slate-800 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Storage (GB)</Label>
                  <Input
                    type="number"
                    value={matrixForm.max_storage_gb}
                    onChange={(e) => setMatrixForm(f => ({ ...f, max_storage_gb: Number(e.target.value) }))}
                    className="bg-slate-900 border-slate-800 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <Label className="text-xs font-semibold text-slate-300">Feature Access Permissions</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMatrixForm(f => ({ ...f, site_diary: !f.site_diary }))}
                    className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 ${
                      matrixForm.site_diary ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    Site Diary
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatrixForm(f => ({ ...f, client_portal: !f.client_portal }))}
                    className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 ${
                      matrixForm.client_portal ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    Client Portal
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatrixForm(f => ({ ...f, api_access: !f.api_access }))}
                    className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 ${
                      matrixForm.api_access ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    API Access
                  </button>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAdminMatrixOpen(false)}
                  className="bg-slate-900 border-slate-800 text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={matrixMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                >
                  {matrixMutation.isPending ? 'Saving Definitions...' : 'Update Plan Definitions'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
