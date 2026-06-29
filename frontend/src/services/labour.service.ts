import api from './api'
import type { PaginatedResponse } from '@/types'

export interface DailyLabourSummary {
  id: number
  project_id: number
  date: string
  trade: string
  workers_count: number
  daily_rate: number
  paid_amount?: number
  contractor_id?: number
  remarks?: string
  verification_status: 'pending' | 'approved' | 'rejected'
  verified_by_id?: number
  verified_at?: string
  verification_remarks?: string
  created_at: string
}

export interface LabourMetrics {
  total_workers: number
  total_cost: number
  by_trade: Record<string, { count: number; cost: number }>
  by_contractor: Record<string, { count: number; cost: number }>
}

export interface DirectLabourSummary {
  total_accrued: number
  total_paid: number
  pending_amount: number
}

export const labourService = {
  async getDirectLabourSummary(project_id: number): Promise<DirectLabourSummary> {
    const response = await api.get('/labour/direct-labour/summary', { params: { project_id } })
    return response.data
  },

  async list(project_id: number, params?: {
    page?: number
    size?: number
    date_from?: string
    date_to?: string
    trade?: string
    contractor_id?: number
  }): Promise<PaginatedResponse<DailyLabourSummary>> {
    const response = await api.get('/labour/', { params: { project_id, ...params } })
    return response.data
  },

  async create(project_id: number, data: Partial<DailyLabourSummary>): Promise<DailyLabourSummary> {
    const response = await api.post('/labour/', data, { params: { project_id } })
    return response.data
  },

  async update(id: number, data: Partial<DailyLabourSummary>): Promise<DailyLabourSummary> {
    const response = await api.patch(`/labour/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/labour/${id}`)
  },

  async getSummary(project_id: number, date_from: string, date_to: string): Promise<LabourMetrics> {
    const response = await api.get('/labour/summary', {
      params: { project_id, date_from, date_to }
    })
    return response.data
  },

  async getTrades(): Promise<string[]> {
    const response = await api.get('/labour/trades')
    return response.data
  },

  async verify(id: number, status: 'approved' | 'rejected', remarks?: string): Promise<DailyLabourSummary> {
    const response = await api.post(`/labour/${id}/verify`, { status, remarks })
    return response.data
  }
}
