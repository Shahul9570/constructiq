import api from './api'

export interface SiteDiaryItem {
  id: number
  project_id: number
  project_name?: string
  date: string
  weather_condition: string
  temperature_c: number
  rainfall_mm: number
  work_impact: string
  crane_stoppage_hours: number
  lost_man_hours: number
  impacted_activities?: string
  delay_description?: string
  shift_type: string
  logged_by_id?: number
  logged_by_name?: string
  created_at: string
}

export interface SiteDiarySummary {
  total_entries: number
  total_stoppage_days: number
  total_lost_man_hours: number
  total_crane_stoppage_hours: number
  total_rainfall_mm: number
  impact_breakdown: Record<string, number>
}

export interface CreateSiteDiaryInput {
  project_id: number
  date: string
  weather_condition?: string
  temperature_c?: number
  rainfall_mm?: number
  work_impact?: string
  crane_stoppage_hours?: number
  lost_man_hours?: number
  impacted_activities?: string
  delay_description?: string
  shift_type?: string
}

export const siteDiaryService = {
  async list(params?: { project_id?: number; start_date?: string; end_date?: string; work_impact?: string }): Promise<SiteDiaryItem[]> {
    const response = await api.get('/site-diary', { params })
    return response.data
  },

  async getSummary(params?: { project_id?: number }): Promise<SiteDiarySummary> {
    const response = await api.get('/site-diary/summary', { params })
    return response.data
  },

  async create(data: CreateSiteDiaryInput): Promise<SiteDiaryItem> {
    const response = await api.post('/site-diary', data)
    return response.data
  }
}
