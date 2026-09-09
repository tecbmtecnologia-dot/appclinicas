import { api } from './client'
import type { ResumoDashboard } from '../types'

export const dashboardApi = {
  resumo: (mes: number, ano: number) => api.get<ResumoDashboard>(`/dashboard/resumo?mes=${mes}&ano=${ano}`),
}
