import api from './api'
import type { User } from '../types'

export const userService = {
  async list(params?: { role?: string; search?: string; page?: number; size?: number }): Promise<{ items: User[]; total: number; page: number; size: number }> {
    const response = await api.get('/users', { params })
    return response.data
  },
  async update(userId: number, data: Partial<User>): Promise<User> {
    const response = await api.patch(`/users/${userId}`, data)
    return response.data
  },

  async delete(userId: number): Promise<void> {
    await api.delete(`/users/${userId}`)
  },
}
