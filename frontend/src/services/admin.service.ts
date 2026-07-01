import api from './api'
import type { User } from '@/types'

export interface SystemStats {
  total_users: number
  active_users: number
  total_projects: number
}

export const adminService = {
  async getSystemStats(): Promise<SystemStats> {
    const response = await api.get('/admin/stats')
    return response.data
  },

  async listUsers(): Promise<User[]> {
    const response = await api.get('/admin/users')
    return response.data
  },

  async updateUserStatus(id: number, is_active: boolean): Promise<User> {
    const response = await api.patch(`/admin/users/${id}/status`, { is_active })
    return response.data
  }
}
