import api from './api'
import type { DailyWorkLog, PaginatedResponse } from '@/types'

export const dailyProgressService = {
  async list(project_id: number, params?: {
    page?: number
    size?: number
    date_from?: string
    date_to?: string
    block_id?: number
  }): Promise<PaginatedResponse<DailyWorkLog>> {
    const response = await api.get('/daily-progress/', { params: { project_id, ...params } })
    return response.data
  },

  async create(project_id: number, data: Partial<DailyWorkLog>): Promise<DailyWorkLog> {
    const response = await api.post('/daily-progress/', data, { params: { project_id } })
    return response.data
  },

  async get(id: number): Promise<DailyWorkLog> {
    const response = await api.get(`/daily-progress/${id}`)
    return response.data
  },

  async update(id: number, data: Partial<DailyWorkLog>): Promise<DailyWorkLog> {
    const response = await api.patch(`/daily-progress/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/daily-progress/${id}`)
  },

  async getDailySummary(project_id: number, date: string): Promise<any> {
    const response = await api.get('/daily-progress/summary/daily', {
      params: { project_id, date },
    })
    return response.data
  },
}
