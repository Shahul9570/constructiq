import api from './api'
import type { AIReport, AIAnswer, CompletionPrediction, MaterialForecast, CostForecast, RiskDetection } from '@/types'

export const aiService = {
  async generateReport(project_id: number): Promise<AIReport> {
    const response = await api.post(`/ai/generate-report/${project_id}`)
    return response.data
  },

  async askQuestion(question: string, project_id: number): Promise<AIAnswer> {
    const response = await api.post('/ai/ask', { question, project_id })
    return response.data
  },

  async predictCompletion(project_id: number): Promise<CompletionPrediction> {
    const response = await api.get(`/ai/predict-completion/${project_id}`)
    return response.data
  },

  async forecastMaterials(project_id: number): Promise<MaterialForecast> {
    const response = await api.get(`/ai/forecast-materials/${project_id}`)
    return response.data
  },

  async forecastCost(project_id: number): Promise<CostForecast> {
    const response = await api.get(`/ai/forecast-cost/${project_id}`)
    return response.data
  },

  async detectRisks(project_id: number): Promise<RiskDetection> {
    const response = await api.get(`/ai/detect-risks/${project_id}`)
    return response.data
  },
}
