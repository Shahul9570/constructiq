import api from './api'
import type { User } from '../types'

export const userService = {
  async list(params?: { role?: string; search?: string; page?: number; size?: number }): Promise<{ items: User[]; total: number; page: number; size: number }> {
    const response = await api.get('/users', { params })
    return response.data
  },
}
