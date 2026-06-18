export interface ProjectTask {
  id: number
  project_id: number
  name: string
  description?: string
  weight_percentage: number
  progress_percentage: number
  created_at: string
  updated_at: string
}
