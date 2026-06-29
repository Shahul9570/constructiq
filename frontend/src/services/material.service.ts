import api from './api'
import type { Material, MaterialArrival, MaterialConsumption, PaginatedResponse } from '@/types'

export const materialService = {
  async list(project_id: number, params?: {
    page?: number
    size?: number
    material_type?: string
    search?: string
  }): Promise<PaginatedResponse<Material>> {
    const response = await api.get(`/materials/`, { params: { project_id, ...params } })
    return response.data
  },

  async get(id: number): Promise<Material> {
    const response = await api.get(`/materials/${id}`)
    return response.data
  },

  async create(project_id: number, data: Partial<Material>): Promise<Material> {
    const response = await api.post(`/materials/`, data, { params: { project_id } })
    return response.data
  },

  async update(id: number, data: Partial<Material>): Promise<Material> {
    const response = await api.patch(`/materials/${id}`, data)
    return response.data
  },

  async addArrival(material_id: number, data: Partial<MaterialArrival>): Promise<MaterialArrival> {
    const response = await api.post(`/materials/${material_id}/arrivals`, data)
    return response.data
  },
  async updateArrival(arrival_id: number, data: Partial<MaterialArrival>): Promise<MaterialArrival> {
    const response = await api.patch(`/materials/arrivals/${arrival_id}`, data)
    return response.data
  },

  async addConsumption(material_id: number, data: Partial<MaterialConsumption>): Promise<MaterialConsumption> {
    const response = await api.post(`/materials/${material_id}/consumptions`, data)
    return response.data
  },

  async listArrivals(material_id: number): Promise<MaterialArrival[]> {
    const response = await api.get(`/materials/${material_id}/arrivals`)
    return response.data
  },

  async listConsumptions(material_id: number): Promise<MaterialConsumption[]> {
    const response = await api.get(`/materials/${material_id}/consumptions`)
    return response.data
  },
}
