import api from './api'
import type { Photo } from '@/types'

export const photoService = {
  async list(project_id: number, params?: {
    page?: number
    size?: number
    area?: string
    date_from?: string
    date_to?: string
  }): Promise<any> {
    const response = await api.get('/photos/', { params: { project_id, ...params } })
    return response.data
  },

  async upload(project_id: number, formData: FormData): Promise<Photo> {
    const response = await api.post('/photos/', formData, {
      params: { project_id },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/photos/${id}`)
  },
}
