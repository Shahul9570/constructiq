import api from './api'
import type { Document } from '@/types'

export const documentService = {
  async list(project_id: number, params?: {
    page?: number
    size?: number
    category?: string
    search?: string
  }): Promise<any> {
    const response = await api.get('/documents/', { params: { project_id, ...params } })
    return response.data
  },

  async upload(project_id: number, formData: FormData): Promise<Document> {
    const response = await api.post('/documents/', formData, {
      params: { project_id },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/documents/${id}`)
  },
}
