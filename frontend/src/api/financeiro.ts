import { api } from './client'
import type { ResumoFinanceiroClinica } from '../types'

export const financeiroApi = {
  resumo: (mes: number, ano: number) => api.get<ResumoFinanceiroClinica>(`/financeiro/resumo?mes=${mes}&ano=${ano}`),
}
