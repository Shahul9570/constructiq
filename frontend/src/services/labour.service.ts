import api from './api'
import type { PaginatedResponse } from '@/types'

export interface DailyLabourSummary {
  id: number
  project_id: number
  date: string
  trade: string
  workers_count: number
  daily_rate: number
  contractor_id?: number
  remarks?: string
  created_at: string
}

export interface LabourMetrics {
  total_workers: number
  total_cost: number
  by_trade: Record<string, { count: number; cost: number }>
  by_contractor: Record<string, { count: number; cost: number }>
}

export const labourService = {
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
  }
}
