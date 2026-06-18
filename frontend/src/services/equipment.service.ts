import api from './api'
import type { Equipment, PaginatedResponse } from '@/types'

export interface EquipmentUsage {
  id: number
  equipment_id: number
  project_id: number
  date: string
  hours_used: number
  fuel_used?: number
  operator_name?: string
  activity?: string
  notes?: string
}

export const equipmentService = {
  async list(project_id: number, params?: {
    page?: number
    size?: number
    equipment_type?: string
    status?: string
    search?: string
  }): Promise<PaginatedResponse<Equipment>> {
    const response = await api.get('/equipment/', { params: { project_id, ...params } })
    return response.data
  },

  async get(id: number): Promise<Equipment> {
    const response = await api.get(`/equipment/${id}`)
    return response.data
  },

  async create(project_id: number, data: Partial<Equipment>): Promise<Equipment> {
    const response = await api.post('/equipment/', data, { params: { project_id } })
    return response.data
  },

  async update(id: number, data: Partial<Equipment>): Promise<Equipment> {
    const response = await api.patch(`/equipment/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/equipment/${id}`)
  },

  async recordUsage(equipment_id: number, project_id: number, data: Partial<EquipmentUsage>): Promise<EquipmentUsage> {
    const response = await api.post(`/equipment/${equipment_id}/usage`, data, { params: { project_id } })
    return response.data
  },

  async listUsage(equipment_id: number): Promise<EquipmentUsage[]> {
    const response = await api.get(`/equipment/${equipment_id}/usage`)
    return response.data
  },
}
