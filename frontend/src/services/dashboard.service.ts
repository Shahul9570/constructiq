import api from './api'
import type { DashboardSiteEngineer, DashboardProjectManager, DashboardOwner } from '@/types'

export const dashboardService = {
  async getSiteEngineer(project_id: number): Promise<DashboardSiteEngineer> {
    const response = await api.get('/dashboards/site-engineer', { params: { project_id } })
    return response.data
  },

  async getProjectManager(project_id: number): Promise<DashboardProjectManager> {
    const response = await api.get('/dashboards/project-manager', { params: { project_id } })
    return response.data
  },

  async getOwner(): Promise<DashboardOwner> {
    const response = await api.get('/dashboards/owner')
    return response.data
  },

  async getClient(): Promise<any> {
    const response = await api.get('/dashboards/client')
    return response.data
  },

  async getSuperAdmin(): Promise<any> {
    const response = await api.get('/dashboards/super-admin')
    return response.data
  },
}
