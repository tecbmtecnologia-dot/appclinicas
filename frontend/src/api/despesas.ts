import { api } from './client'
import type { DespesaClinica } from '../types'

export interface DespesaForm {
  descricao: string
  categoria?: string | null
  valor: number
  data: string
  forma_pagamento?: string | null
  status?: 'pago' | 'pendente'
}

export const despesasApi = {
  listar: () => api.get<DespesaClinica[]>('/despesas'),
  criar: (data: DespesaForm) => api.post<DespesaClinica>('/despesas', data),
  atualizar: (id: string, data: Partial<DespesaForm>) => api.put<DespesaClinica>(`/despesas/${id}`, data),
  remover: (id: string) => api.del<void>(`/despesas/${id}`),
}
