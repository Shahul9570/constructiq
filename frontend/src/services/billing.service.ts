import api from './api'
import { Invoice } from '../types'

export interface BillingSummary {
  total_billed: number
  total_collected: number
  pending_receivables: number
  total_cost: number
  profit_margin_percentage: number
  is_profitable: boolean
}

export const billingService = {
  getSummary: async (projectId: number): Promise<BillingSummary> => {
    const response = await api.get(`/billing/summary?project_id=${projectId}`)
    return response.data
  },

  listInvoices: async (projectId: number, status?: string): Promise<Invoice[]> => {
    const params = new URLSearchParams({ project_id: projectId.toString() })
    if (status) params.append('status', status)
    const response = await api.get(`/billing/invoices?${params.toString()}`)
    return response.data
  },

  createInvoice: async (
    data: Omit<Invoice, 'id' | 'project_id' | 'total_amount' | 'created_by' | 'created_at' | 'updated_at'> & { project_id: number }
  ): Promise<Invoice> => {
    const response = await api.post('/billing/invoices', data)
    return response.data
  },

  updateInvoice: async (
    invoiceId: number,
    data: Partial<Pick<Invoice, 'status' | 'paid_date' | 'payment_method' | 'notes'>>
  ): Promise<Invoice> => {
    const response = await api.patch(`/billing/invoices/${invoiceId}`, data)
    return response.data
  },

  getClientInvoices: async (projectId: number, status?: string): Promise<Invoice[]> => {
    const params = new URLSearchParams({ project_id: projectId.toString() })
    if (status) params.append('status', status)
    const response = await api.get(`/billing/client-portal/invoices?${params.toString()}`)
    return response.data
  },

  submitClientPayment: async (
    invoiceId: number,
    paymentMethod: string,
    notes?: string
  ): Promise<Invoice> => {
    const response = await api.post(`/billing/client-portal/invoices/${invoiceId}/submit-payment`, {
      payment_method: paymentMethod,
      notes: notes
    })
    return response.data
  },

  verifyPayment: async (invoiceId: number, paidDate: string): Promise<Invoice> => {
    const response = await api.patch(`/billing/invoices/${invoiceId}`, {
      status: 'paid',
      paid_date: paidDate
    })
    return response.data
  }
}
