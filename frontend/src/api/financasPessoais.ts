import { api } from './client'
import type { FinancaPessoal, ResumoFinancasPessoais, TipoFinancaPessoal } from '../types'

export interface FinancaPessoalForm {
  tipo: TipoFinancaPessoal
  descricao: string
  categoria?: string | null
  valor: number
  data: string
}

export const financasPessoaisApi = {
  listar: () => api.get<FinancaPessoal[]>('/financas-pessoais'),
  resumo: (mes: number, ano: number) => api.get<ResumoFinancasPessoais>(`/financas-pessoais/resumo?mes=${mes}&ano=${ano}`),
  criar: (data: FinancaPessoalForm) => api.post<FinancaPessoal>('/financas-pessoais', data),
  atualizar: (id: string, data: Partial<FinancaPessoalForm>) => api.put<FinancaPessoal>(`/financas-pessoais/${id}`, data),
  remover: (id: string) => api.del<void>(`/financas-pessoais/${id}`),
}
