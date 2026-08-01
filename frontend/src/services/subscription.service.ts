import api from './api'

export interface SubscriptionUsageStats {
  used_projects: number
  max_projects: number
  used_workers: number
  max_workers: number
  used_storage_gb: number
  max_storage_gb: number
  ai_tokens_used: number
  ai_tokens_limit: number
}

export interface CompanySubscription {
  id: number
  company_name: string
  owner_id: number
  plan_tier: 'free' | 'starter' | 'professional' | 'enterprise'
  billing_cycle: 'monthly' | 'annual'
  status: 'active' | 'trialing' | 'past_due' | 'canceled'
  amount_paid: number
  current_period_start: string
  current_period_end?: string
  usage: SubscriptionUsageStats
}

export interface PaymentReceipt {
  id: number
  transaction_id: string
  company_name: string
  plan_tier: string
  billing_cycle: string
  amount: number
  tax_amount: number
  total_amount: number
  payment_method: string
  card_last4?: string
  status: string
  payment_date: string
}

export interface AdminMRRData {
  total_subscriptions: number
  active_subscriptions: number
  mrr: number
  arr: number
  tier_distribution: Record<string, number>
  subscriptions: Array<{
    id: number
    company_name: string
    plan_tier: string
    billing_cycle: string
    status: string
    amount_paid: number
    created_at: string
  }>
}

export const subscriptionService = {
  async getMySubscription(): Promise<CompanySubscription> {
    const response = await api.get('/subscriptions/me')
    return response.data
  },

  async upgradePlan(plan_tier: string, billing_cycle: string = 'monthly'): Promise<CompanySubscription> {
    const response = await api.post('/subscriptions/upgrade', { plan_tier, billing_cycle })
    return response.data
  },

  async checkout(data: {
    plan_tier: string
    billing_cycle: string
    payment_method: string
    card_name?: string
    card_number?: string
  }): Promise<PaymentReceipt> {
    const response = await api.post('/subscriptions/checkout', data)
    return response.data
  },

  async getReceipts(): Promise<PaymentReceipt[]> {
    const response = await api.get('/subscriptions/receipts')
    return response.data
  },

  async getAdminMRR(): Promise<AdminMRRData> {
    const response = await api.get('/subscriptions/all')
    return response.data
  },

  async overrideSubscription(data: {
    subscription_id: number
    plan_tier: string
    billing_cycle?: string
    status?: string
    max_projects?: number
    max_workers?: number
    max_storage_gb?: number
    ai_tokens_limit?: number
    amount_paid?: number
  }): Promise<any> {
    const response = await api.put('/subscriptions/admin/override', data)
    return response.data
  },

  async getPlanConfigs(): Promise<any> {
    const response = await api.get('/subscriptions/plans/config')
    return response.data
  },

  async updatePlanConfig(data: {
    plan_tier: string
    monthly_price?: number
    annual_price?: number
    max_projects?: number
    max_workers?: number
    max_storage_gb?: number
    site_diary?: boolean
    client_portal?: boolean
    api_access?: boolean
  }): Promise<any> {
    const response = await api.put('/subscriptions/admin/plans/config', data)
    return response.data
  }
}
