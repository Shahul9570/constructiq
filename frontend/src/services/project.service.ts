import api from './api'
import type { Project, PaginatedResponse } from '@/types'

export const projectService = {
  async list(params?: {
    page?: number
    size?: number
    status?: string
    search?: string
    is_archived?: boolean
  }): Promise<PaginatedResponse<Project>> {
    const response = await api.get('/projects', { params })
    return response.data
  },

  async get(id: number): Promise<Project> {
    const response = await api.get(`/projects/${id}`)
    return response.data
  },

  async create(data: Partial<Project>): Promise<Project> {
    const response = await api.post('/projects', data)
    return response.data
  },

  async update(id: number, data: Partial<Project>): Promise<Project> {
    const response = await api.patch(`/projects/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/projects/${id}`)
  },

  async archive(id: number): Promise<void> {
    await api.post(`/projects/${id}/archive`)
  },

  async getStats(id: number): Promise<any> {
    const response = await api.get(`/projects/${id}/stats`)
    return response.data
  },
}
