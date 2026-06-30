import api from './api'
import { Notification } from '../types'

export const notificationService = {
  getNotifications: async (limit: number = 50): Promise<Notification[]> => {
    const response = await api.get(`/notifications?limit=${limit}`)
    return response.data
  },

  getUnreadCount: async (): Promise<{ unread_count: number }> => {
    const response = await api.get('/notifications/unread-count')
    return response.data
  },

  markAsRead: async (notificationId: number): Promise<Notification> => {
    const response = await api.post(`/notifications/${notificationId}/read`)
    return response.data
  },

  markAllAsRead: async (): Promise<{ message: string }> => {
    const response = await api.post('/notifications/read-all')
    return response.data
  }
}
