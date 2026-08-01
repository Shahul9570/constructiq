import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CreditCard, Check, X, ShieldCheck, FolderKanban, Users, HardDrive, Bot, Sparkles,
  Building, Eye, FileText, Download, Receipt, Sliders, DollarSign, Activity, Crown, Edit3,
  Search, ArrowUpRight, CheckCircle2, RefreshCw, BarChart3, Layers, Filter
} from 'lucide-react'
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
  const isAdmin = (user?.role as string) === 'super_admin' || (user?.role as string) === 'company_owner'

  const [activeTab, setActiveTab] = useState<'governance' | 'plans' | 'usage' | 'billing'>(
    isAdmin ? 'governance' : 'plans'
  )
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [searchQuery, setSearchQuery] = useState('')

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

  const { data: adminData } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: () => subscriptionService.getAdminMRR(),
    enabled: isAdmin,
  })

  const overrideMutation = useMutation({
    mutationFn: (data: any) => subscriptionService.overrideSubscription(data),
    onSuccess: (res) => {
      toast.success(res.message || 'Subscription updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
      setIsAdminOverrideOpen(false)
    },
    onError: () => {
      toast.error('Failed to update company subscription.')
    }
  })

  const matrixMutation = useMutation({
    mutationFn: (data: any) => subscriptionService.updatePlanConfig(data),
    onSuccess: (res) => {
      toast.success(res.message || 'Plan matrix definitions updated!')
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
      setIsAdminMatrixOpen(false)
    },
    onError: () => {
      toast.error('Failed to update plan definitions.')
    }
  })

  const handleOpenCheckout = (tier: string, priceMonthly: number, priceAnnual: number) => {
    if (tier === 'free' || priceMonthly === 0) {
      subscriptionService.upgradePlan('free', billingCycle).then((updated) => {
        queryClient.setQueryData(['my-subscription'], updated)
        toast.success('Switched to Free tier.')
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
        Loading subscription engine...
      </div>
    )
  }

  if (isError || !sub) {
    return (
      <div className="p-8 text-center text-red-400 bg-red-950/20 rounded-xl border border-red-900/50">
        Failed to load subscription details. Please refresh the page.
      </div>
    )
  }

  const usage = sub.usage
  const filteredSubscriptions = adminData?.subscriptions?.filter((s: any) =>
    s.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.owner_email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const comparisonRows = [
    { feature: 'Monthly Price', free: '$0', starter: billingCycle === 'annual' ? '$49' : '$59', pro: billingCycle === 'annual' ? '$199' : '$249', enterprise: 'Custom ($999+)' },
    { feature: 'Projects', free: '1', starter: '5', pro: '25', enterprise: 'Unlimited' },
    { feature: 'Users / Seats', free: '5', starter: '20', pro: '100', enterprise: 'Unlimited' },
    { feature: 'Daily Site Logs', free: true, starter: true, pro: true, enterprise: true },
    { feature: 'Materials & Equipment', free: true, starter: true, pro: true, enterprise: true },
    { feature: 'Financial Invoicing', free: 'Basic', starter: true, pro: true, enterprise: true },
    { feature: 'AI Construction Reports', free: 'Limited', starter: true, pro: true, enterprise: true },
    { feature: '3D Digital Twin Viewer', free: 'Viewer', starter: 'GLB Live', pro: 'GLB + Timeline', enterprise: 'IFC/BIM + Enterprise' },
    { feature: 'Daily Site Diary & Weather', free: false, starter: false, pro: true, enterprise: true },
    { feature: 'Client Portal', free: false, starter: true, pro: true, enterprise: true },
    { feature: 'API Access', free: false, starter: false, pro: 'Limited', enterprise: 'Full' },
    { feature: 'SSO & Dedicated SLA', free: false, starter: false, pro: false, enterprise: true },
  ]

  const renderCellContent = (value: any) => {
    if (value === true) return <span className="inline-flex items-center justify-center p-1 rounded-full bg-emerald-500/20 text-emerald-400"><Check className="h-4 w-4" /></span>
    if (value === false) return <span className="inline-flex items-center justify-center p-1 text-slate-600"><X className="h-4 w-4" /></span>
    if (value === 'Basic') return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">Basic</span>
    return <span className="text-xs font-semibold text-slate-200">{value}</span>
  }

  return (
    <div className="space-y-6 max-w-7xl pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 text-orange-400 shadow-inner">
            <Crown className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-white">SaaS Subscriptions & Platform Hub</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-widest">
                Platform Operator
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Manage tenant company subscriptions, revenue analytics, custom plan overrides, and tier feature matrix.
            </p>
          </div>
        </div>

        {/* Global Admin Actions */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsAdminMatrixOpen(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 flex items-center gap-1.5"
            >
              <Edit3 className="h-4 w-4" /> Edit Plan Matrix
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 overflow-x-auto">
        {isAdmin && (
          <button
            onClick={() => setActiveTab('governance')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'governance'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="h-4 w-4" /> Revenue & Tenants
          </button>
        )}
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'plans'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-950/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Layers className="h-4 w-4" /> Subscription Plans & Matrix
        </button>
        <button
          onClick={() => setActiveTab('usage')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'usage'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-950/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Activity className="h-4 w-4" /> Resource Usage & Limits
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'billing'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-950/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Receipt className="h-4 w-4" /> Billing Receipts ({receipts.length})
        </button>
      </div>

      {/* TAB 1: TENANT GOVERNANCE & MRR REVENUE (ADMIN) */}
      {activeTab === 'governance' && isAdmin && adminData && (
        <div className="space-y-6">
          {/* Revenue KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Monthly MRR</p>
                  <p className="text-2xl font-black text-emerald-400 font-mono mt-1">${adminData.mrr.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <DollarSign className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Annual ARR</p>
                  <p className="text-2xl font-black text-orange-400 font-mono mt-1">${adminData.arr.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <BarChart3 className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Tenants</p>
                  <p className="text-2xl font-black text-white font-mono mt-1">{adminData.active_subscriptions} / {adminData.total_subscriptions}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Building className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pro / Enterprise</p>
                  <p className="text-2xl font-black text-purple-400 font-mono mt-1">
                    {(adminData.tier_distribution.professional || 0) + (adminData.tier_distribution.enterprise || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Crown className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tenants Portfolio Table */}
          <Card className="bg-slate-950/90 border-slate-800 backdrop-blur-xl shadow-2xl overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Building className="h-5 w-5 text-orange-400" /> Tenant Company Subscriptions
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Grant custom plan tiers, adjust project/seat caps, or override tenant billing status.
                </CardDescription>
              </div>

              {/* Search Filter */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search company or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-xs text-slate-200 pl-9"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase font-semibold">
                      <th className="p-4">Company & Owner</th>
                      <th className="p-4">Active Plan</th>
                      <th className="p-4">Allocated Quotas</th>
                      <th className="p-4 text-right">Billing</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {filteredSubscriptions.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-white">{s.company_name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{s.owner_email}</p>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
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
                        <td className="p-4 text-right font-extrabold text-white font-mono">
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
                            className="h-8 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
                          >
                            <Sliders className="h-3.5 w-3.5 mr-1" /> Edit Plan
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: SUBSCRIPTION PLANS & FEATURE COMPARISON */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          {/* Billing Cycle Toggle */}
          <div className="flex justify-center">
            <div className="flex items-center bg-slate-900 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  billingCycle === 'monthly' ? 'bg-orange-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  billingCycle === 'annual' ? 'bg-orange-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Annual Billing <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded-full">20% OFF</span>
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Free */}
            <Card className="bg-slate-900/60 border-slate-800 flex flex-col justify-between p-6 hover:border-slate-700 transition-all">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Free Tier</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$0</span>
                  <span className="text-xs text-slate-400">/mo</span>
                </div>
                <p className="text-slate-400 text-xs">For small contractors & freelancers managing 1 active site.</p>
                <ul className="space-y-2 pt-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> 1 Active Project</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> 5 Team Members</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> 5 GB Storage</li>
                </ul>
              </div>
              <Button variant="outline" onClick={() => handleOpenCheckout('free', 0, 0)} className="w-full mt-6 bg-slate-900 border-slate-700 text-slate-300">
                Select Free
              </Button>
            </Card>

            {/* Starter */}
            <Card className="bg-slate-900/60 border-amber-500/30 flex flex-col justify-between p-6 hover:border-amber-500/50 transition-all">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Starter</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">${billingCycle === 'annual' ? '49' : '59'}</span>
                  <span className="text-xs text-slate-400">/mo</span>
                </div>
                <p className="text-slate-400 text-xs">For growing construction teams needing multi-project management.</p>
                <ul className="space-y-2 pt-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-amber-400" /> 5 Active Projects</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-amber-400" /> 20 Team Members</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-amber-400" /> 50 GB Storage</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-amber-400" /> Client Portal Access</li>
                </ul>
              </div>
              <Button onClick={() => handleOpenCheckout('starter', 59, 590)} className="w-full mt-6 bg-amber-600 hover:bg-amber-500 text-white font-bold">
                Upgrade $59
              </Button>
            </Card>

            {/* Professional */}
            <Card className="bg-slate-900/90 border-orange-500 flex flex-col justify-between p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                Popular
              </div>
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-400">Professional</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">${billingCycle === 'annual' ? '199' : '249'}</span>
                  <span className="text-xs text-slate-400">/mo</span>
                </div>
                <p className="text-slate-400 text-xs">Full suite with Weather Delay Tracker & Digital Twin timeline.</p>
                <ul className="space-y-2 pt-2 text-xs text-slate-200 font-semibold">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-orange-400" /> 25 Active Projects</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-orange-400" /> 100 Team Members</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-orange-400" /> 250 GB Storage</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-orange-400" /> Weather Delay Tracker</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-orange-400" /> GLB 3D Timeline Sync</li>
                </ul>
              </div>
              <Button onClick={() => handleOpenCheckout('professional', 249, 2490)} className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-950/50">
                Upgrade $249
              </Button>
            </Card>

            {/* Enterprise */}
            <Card className="bg-slate-900/60 border-purple-500/30 flex flex-col justify-between p-6 hover:border-purple-500/50 transition-all">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Enterprise</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">${billingCycle === 'annual' ? '799' : '999'}</span>
                  <span className="text-xs text-slate-400">/mo</span>
                </div>
                <p className="text-slate-400 text-xs">Custom BIM integration, unlimited projects, & dedicated SLA support.</p>
                <ul className="space-y-2 pt-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400" /> Unlimited Projects</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400" /> Unlimited Seats</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400" /> 1,000 GB Storage</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400" /> Full API & Webhooks</li>
                </ul>
              </div>
              <Button onClick={() => handleOpenCheckout('enterprise', 999, 9990)} className="w-full mt-6 bg-purple-600 hover:bg-purple-500 text-white font-bold">
                Upgrade $999
              </Button>
            </Card>
          </div>

          {/* Comparison Matrix Table */}
          <Card className="bg-slate-950/90 border-slate-800 shadow-2xl overflow-hidden mt-8">
            <CardHeader className="p-5 border-b border-slate-800">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-400" /> Feature Matrix Breakdown
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-xs font-bold text-slate-300">
                    <th className="p-4 w-1/5">Feature</th>
                    <th className="p-4 text-center w-1/5">Free</th>
                    <th className="p-4 text-center text-amber-400 w-1/5">Starter</th>
                    <th className="p-4 text-center text-orange-400 bg-orange-500/10 w-1/5">Professional</th>
                    <th className="p-4 text-center text-purple-400 w-1/5">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {comparisonRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-900/40">
                      <td className="p-4 font-semibold text-slate-300">{r.feature}</td>
                      <td className="p-4 text-center">{renderCellContent(r.free)}</td>
                      <td className="p-4 text-center">{renderCellContent(r.starter)}</td>
                      <td className="p-4 text-center bg-orange-500/5">{renderCellContent(r.pro)}</td>
                      <td className="p-4 text-center">{renderCellContent(r.enterprise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: RESOURCE USAGE GAUGES */}
      {activeTab === 'usage' && (
        <Card className="bg-slate-950/90 border-slate-800 shadow-2xl p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-400" /> Tenant Resource Allocations & Quota Gauges
            </h2>
            <p className="text-slate-400 text-xs mt-1">Real-time resource utilization for active projects, worker seats, storage, and AI tokens.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-200">
                <span className="flex items-center gap-2"><FolderKanban className="h-4 w-4 text-orange-400" /> Active Projects</span>
                <span className="font-mono text-orange-400">{usage.used_projects} / {usage.max_projects}</span>
              </div>
              <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min((usage.used_projects / usage.max_projects) * 100, 100)}%` }} />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-200">
                <span className="flex items-center gap-2"><Users className="h-4 w-4 text-amber-400" /> Worker Seats</span>
                <span className="font-mono text-amber-400">{usage.used_workers} / {usage.max_workers}</span>
              </div>
              <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min((usage.used_workers / usage.max_workers) * 100, 100)}%` }} />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-200">
                <span className="flex items-center gap-2"><HardDrive className="h-4 w-4 text-blue-400" /> Storage Usage</span>
                <span className="font-mono text-blue-400">{usage.used_storage_gb} / {usage.max_storage_gb} GB</span>
              </div>
              <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((usage.used_storage_gb / usage.max_storage_gb) * 100, 100)}%` }} />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-200">
                <span className="flex items-center gap-2"><Bot className="h-4 w-4 text-purple-400" /> AI Tokens Limit</span>
                <span className="font-mono text-purple-400">{(usage.ai_tokens_used / 1000).toFixed(1)}k / {(usage.ai_tokens_limit / 1000).toFixed(0)}k</span>
              </div>
              <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min((usage.ai_tokens_used / usage.ai_tokens_limit) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 4: BILLING RECEIPTS */}
      {activeTab === 'billing' && (
        <Card className="bg-slate-950/90 border-slate-800 shadow-2xl overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-800">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Receipt className="h-5 w-5 text-orange-400" /> Official Tax Invoices & Payment Receipts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {receipts.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No payment receipts found yet. Upgrade your plan to generate transaction receipts.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-mono">
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
                      <tr key={r.id} className="hover:bg-slate-900/40">
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
                            className="h-7 text-xs text-orange-400 hover:bg-orange-500/10"
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
      )}

      {/* Checkout & Success Modals */}
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
                  <Select value={overrideForm.plan_tier} onValueChange={(val) => setOverrideForm(f => ({ ...f, plan_tier: val }))}>
                    <SelectTrigger className="bg-slate-900 border-slate-800 text-xs text-slate-200">
                      <SelectValue placeholder="Select Plan" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                      <SelectItem value="free">Free Tier</SelectItem>
                      <SelectItem value="starter">Starter Tier ($59)</SelectItem>
                      <SelectItem value="professional">Professional Tier ($249)</SelectItem>
                      <SelectItem value="enterprise">Enterprise Tier ($999+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Subscription Status</Label>
                  <Select value={overrideForm.status} onValueChange={(val) => setOverrideForm(f => ({ ...f, status: val }))}>
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
                  <Input type="number" value={overrideForm.max_projects} onChange={(e) => setOverrideForm(f => ({ ...f, max_projects: Number(e.target.value) }))} className="bg-slate-900 border-slate-800 text-xs text-slate-200 font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Max Worker Seats</Label>
                  <Input type="number" value={overrideForm.max_workers} onChange={(e) => setOverrideForm(f => ({ ...f, max_workers: Number(e.target.value) }))} className="bg-slate-900 border-slate-800 text-xs text-slate-200 font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Storage (GB)</Label>
                  <Input type="number" value={overrideForm.max_storage_gb} onChange={(e) => setOverrideForm(f => ({ ...f, max_storage_gb: Number(e.target.value) }))} className="bg-slate-900 border-slate-800 text-xs text-slate-200 font-mono" />
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsAdminOverrideOpen(false)} className="bg-slate-900 border-slate-800 text-slate-400 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={overrideMutation.isPending} className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs">
                  {overrideMutation.isPending ? 'Saving...' : 'Apply Plan Override'}
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
                <Select value={matrixForm.plan_tier} onValueChange={(val) => setMatrixForm(f => ({ ...f, plan_tier: val }))}>
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
                  <Input type="number" value={matrixForm.monthly_price} onChange={(e) => setMatrixForm(f => ({ ...f, monthly_price: Number(e.target.value) }))} className="bg-slate-900 border-slate-800 text-xs text-slate-200 font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Annual Price ($)</Label>
                  <Input type="number" value={matrixForm.annual_price} onChange={(e) => setMatrixForm(f => ({ ...f, annual_price: Number(e.target.value) }))} className="bg-slate-900 border-slate-800 text-xs text-slate-200 font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Max Projects</Label>
                  <Input type="number" value={matrixForm.max_projects} onChange={(e) => setMatrixForm(f => ({ ...f, max_projects: Number(e.target.value) }))} className="bg-slate-900 border-slate-800 text-xs text-slate-200 font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Max Seats</Label>
                  <Input type="number" value={matrixForm.max_workers} onChange={(e) => setMatrixForm(f => ({ ...f, max_workers: Number(e.target.value) }))} className="bg-slate-900 border-slate-800 text-xs text-slate-200 font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Storage (GB)</Label>
                  <Input type="number" value={matrixForm.max_storage_gb} onChange={(e) => setMatrixForm(f => ({ ...f, max_storage_gb: Number(e.target.value) }))} className="bg-slate-900 border-slate-800 text-xs text-slate-200 font-mono" />
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsAdminMatrixOpen(false)} className="bg-slate-900 border-slate-800 text-slate-400 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={matrixMutation.isPending} className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs">
                  {matrixMutation.isPending ? 'Saving...' : 'Update Plan Definitions'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
