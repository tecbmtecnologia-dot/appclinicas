import { api } from './client'
import type { Pagamento, StatusPagamento } from '../types'

export interface PagamentoForm {
  paciente_id: string
  orcamento_id?: string | null
  descricao: string
  valor: number
  forma_pagamento?: string | null
  status?: StatusPagamento
  data_vencimento?: string | null
  data_pagamento?: string | null
}

export const pagamentosApi = {
  listar: (params?: { paciente_id?: string; status?: string }) => {
    const qs = new URLSearchParams()
    if (params?.paciente_id) qs.set('paciente_id', params.paciente_id)
    if (params?.status) qs.set('status', params.status)
    const query = qs.toString()
    return api.get<Pagamento[]>(`/pagamentos${query ? `?${query}` : ''}`)
  },
  criar: (data: PagamentoForm) => api.post<Pagamento>('/pagamentos', data),
  atualizar: (id: string, data: Partial<PagamentoForm>) => api.put<Pagamento>(`/pagamentos/${id}`, data),
  remover: (id: string) => api.del<void>(`/pagamentos/${id}`),
}
