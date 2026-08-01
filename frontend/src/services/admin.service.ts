import api from './api'
import type { User } from '@/types'

export interface SystemStats {
  total_users: number
  active_users: number
  total_projects: number
}

export interface AuditLogItem {
  id: number
  user_id?: number
  user_name?: string
  user_email?: string
  action: string
  entity_type?: string
  entity_id?: number
  details?: Record<string, any>
  ip_address?: string
  created_at: string
}

export interface AuditLogsResponse {
  items: AuditLogItem[]
  total: number
  page: number
  size: number
  pages: number
}

export interface SystemHealthData {
  status: string
  uptime_seconds: number
  cpu_usage_percent: number
  memory_usage_percent: number
  total_users: number
  active_users: number
  total_projects: number
  total_workers: number
  total_documents: number
  total_photos: number
  total_audit_events: number
  role_distribution: Record<string, number>
  storage_status: {
    provider: string
    status: string
    total_files: number
  }
}

export interface PlatformSettings {
  maintenance_mode: boolean
  announcement_banner: string
  enable_ai_assistant: boolean
  enable_3d_visualizer: boolean
  enable_client_portal: boolean
  require_2fa: boolean
  max_file_upload_mb: number
  ai_monthly_token_limit: number
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
  },

  async getAuditLogs(params?: { page?: number; size?: number; action?: string; search?: string }): Promise<AuditLogsResponse> {
    const response = await api.get('/admin/audit-logs', { params })
    return response.data
  },

  async getSystemHealth(): Promise<SystemHealthData> {
    const response = await api.get('/admin/system-health')
    return response.data
  },

  async getPlatformSettings(): Promise<PlatformSettings> {
    const response = await api.get('/admin/platform-settings')
    return response.data
  },

  async updatePlatformSettings(data: Partial<PlatformSettings>): Promise<PlatformSettings> {
    const response = await api.patch('/admin/platform-settings', data)
    return response.data
  }
}

