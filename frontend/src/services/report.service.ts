import api from './api'

const handleDownload = async (url: string, params: any, filename: string) => {
  const response = await api.get(url, { params, responseType: 'blob' })
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = blobUrl
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(blobUrl)
  return { message: `Report successfully downloaded as ${params.format?.toUpperCase()}` }
}

export const reportService = {
  async getDaily(project_id: number, report_date: string, format?: string): Promise<any> {
    const params = { project_id, report_date, format }
    if (format && format !== 'json') {
      const ext = format === 'excel' ? 'xlsx' : 'pdf'
      return handleDownload(`/reports/daily`, params, `daily_report_${report_date}.${ext}`)
    }
    const response = await api.get(`/reports/daily`, { params })
    return response.data
  },

  async getWeekly(project_id: number, end_date: string, format?: string): Promise<any> {
    const params = { project_id, end_date, format }
    if (format && format !== 'json') {
      const ext = format === 'excel' ? 'xlsx' : 'pdf'
      return handleDownload(`/reports/weekly`, params, `weekly_report_${end_date}.${ext}`)
    }
    const response = await api.get(`/reports/weekly`, { params })
    return response.data
  },

  async getMonthly(project_id: number, year: number, month: number, format?: string): Promise<any> {
    const params = { project_id, year, month, format }
    if (format && format !== 'json') {
      const ext = format === 'excel' ? 'xlsx' : 'pdf'
      return handleDownload(`/reports/monthly`, params, `monthly_report_${year}_${month}.${ext}`)
    }
    const response = await api.get(`/reports/monthly`, { params })
    return response.data
  },

  async getLabour(project_id: number, date_from: string, date_to: string, format?: string): Promise<any> {
    const params = { project_id, date_from, date_to, format }
    if (format && format !== 'json') {
      const ext = format === 'excel' ? 'xlsx' : 'pdf'
      return handleDownload(`/reports/labour`, params, `labour_report_${date_from}_to_${date_to}.${ext}`)
    }
    const response = await api.get(`/reports/labour`, { params })
    return response.data
  },

  async getMaterial(project_id: number, date_from: string, date_to: string, format?: string): Promise<any> {
    const params = { project_id, date_from, date_to, format }
    if (format && format !== 'json') {
      const ext = format === 'excel' ? 'xlsx' : 'pdf'
      return handleDownload(`/reports/material`, params, `material_report_${date_from}_to_${date_to}.${ext}`)
    }
    const response = await api.get(`/reports/material`, { params })
    return response.data
  },

  async getCost(project_id: number, date_from: string, date_to: string, format?: string): Promise<any> {
    const params = { project_id, date_from, date_to, format }
    if (format && format !== 'json') {
      const ext = format === 'excel' ? 'xlsx' : 'pdf'
      return handleDownload(`/reports/cost`, params, `cost_report_${date_from}_to_${date_to}.${ext}`)
    }
    const response = await api.get(`/reports/cost`, { params })
    return response.data
  },
}
