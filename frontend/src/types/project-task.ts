export interface ProjectTask {
  id: number
  project_id: number
  name: string
  description?: string
  weight_percentage: number
  progress_percentage: number
  status?: string
  assigned_to_id?: number
  assigned_to_name?: string
  area?: string
  quantity?: number
  unit?: string
  work_type?: string
  start_date?: string
  end_date?: string
  created_at: string
  updated_at: string
}
