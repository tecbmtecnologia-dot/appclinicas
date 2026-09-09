import { api } from './client'
import type { TipoProcedimento } from '../types'

export interface TipoProcedimentoForm {
  nome: string
  gera_cirurgia: boolean
}

export const tiposProcedimentoApi = {
  listar: () => api.get<TipoProcedimento[]>('/tipos-procedimento'),
  criar: (data: TipoProcedimentoForm) => api.post<TipoProcedimento>('/tipos-procedimento', data),
  atualizar: (id: string, data: Partial<TipoProcedimentoForm>) => api.put<TipoProcedimento>(`/tipos-procedimento/${id}`, data),
  remover: (id: string) => api.del<void>(`/tipos-procedimento/${id}`),
}
