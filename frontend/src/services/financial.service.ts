import api from './api'
import type { CostRecord, Invoice } from '@/types'

export const financialService = {
  async addCost(project_id: number, data: Partial<CostRecord>): Promise<CostRecord> {
    const response = await api.post('/financial/costs', data, { params: { project_id } })
    return response.data
  },
  async updateCostStatus(cost_id: number, status: string): Promise<CostRecord> {
    const response = await api.post(`/financial/costs/${cost_id}/status`, null, { params: { status } })
    return response.data
  },

  async listCosts(project_id: number, params?: {
    page?: number
    size?: number
    category?: string
    date_from?: string
    date_to?: string
  }): Promise<CostRecord[]> {
    const response = await api.get('/financial/costs', { params: { project_id, ...params } })
    return response.data
  },

  async getSummary(project_id: number, params?: {
    date_from?: string
    date_to?: string
  }): Promise<any> {
    const response = await api.get('/financial/summary', { params: { project_id, ...params } })
    return response.data
  },

  async getBudgetTracking(project_id: number): Promise<any> {
    const response = await api.get('/financial/budget-tracking', { params: { project_id } })
    return response.data
  },

  async createInvoice(project_id: number, data: Partial<Invoice>): Promise<Invoice> {
    const response = await api.post('/financial/invoices', data, { params: { project_id } })
    return response.data
  },

  async listInvoices(project_id: number, params?: {
    page?: number
    size?: number
    status?: string
  }): Promise<Invoice[]> {
    const response = await api.get('/financial/invoices', { params: { project_id, ...params } })
    return response.data
  },

  async updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice> {
    const response = await api.patch(`/financial/invoices/${id}`, data)
    return response.data
  },

  async submitPayment(id: number, data: { payment_method: string; notes?: string }): Promise<Invoice> {
    const response = await api.post(`/financial/invoices/${id}/submit-payment`, data)
    return response.data
  },
}
