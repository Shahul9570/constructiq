import api from './api'
import type { Contractor, ContractorPayment, PaginatedResponse } from '@/types'

export const contractorService = {
  async list(project_id: number, params?: {
    page?: number
    size?: number
    search?: string
  }): Promise<PaginatedResponse<Contractor>> {
    const response = await api.get('/contractors/', { params: { project_id, ...params } })
    return response.data
  },

  async get(id: number): Promise<Contractor> {
    const response = await api.get(`/contractors/${id}`)
    return response.data
  },

  async create(project_id: number, data: Partial<Contractor>): Promise<Contractor> {
    const response = await api.post('/contractors/', data, { params: { project_id } })
    return response.data
  },

  async update(id: number, data: Partial<Contractor>): Promise<Contractor> {
    const response = await api.patch(`/contractors/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/contractors/${id}`)
  },

  async createPayment(contractor_id: number, data: Partial<ContractorPayment>): Promise<ContractorPayment> {
    const response = await api.post(`/contractors/${contractor_id}/payments`, data)
    return response.data
  },

  async listPayments(contractor_id: number): Promise<ContractorPayment[]> {
    const response = await api.get(`/contractors/${contractor_id}/payments`)
    return response.data
  },
}
