import api from './api'
import type { ProjectTask } from '../types/project-task'

export const projectTaskService = {
  async list(projectId: number): Promise<ProjectTask[]> {
    const response = await api.get('/project-tasks', {
      params: { project_id: projectId },
    })
    return response.data
  },

  async create(projectId: number, data: Partial<ProjectTask>): Promise<ProjectTask> {
    const response = await api.post('/project-tasks', data, {
      params: { project_id: projectId },
    })
    return response.data
  },

  async update(id: number, data: Partial<ProjectTask>): Promise<ProjectTask> {
    const response = await api.patch(`/project-tasks/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/project-tasks/${id}`)
  },
}
