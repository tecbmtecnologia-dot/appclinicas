import { api } from './client'
import type { ItemOrcamentoCatalogo, Orcamento, StatusOrcamento } from '../types'

export interface ItemOrcamentoInput {
  item_id: string
  quantidade?: number
}

export interface OrcamentoForm {
  paciente_id: string
  titulo: string
  itens: ItemOrcamentoInput[]
  observacoes?: string | null
  status?: StatusOrcamento
}

export const orcamentosApi = {
  listar: (params?: { paciente_id?: string; status?: string }) => {
    const qs = new URLSearchParams()
    if (params?.paciente_id) qs.set('paciente_id', params.paciente_id)
    if (params?.status) qs.set('status', params.status)
    const query = qs.toString()
    return api.get<Orcamento[]>(`/orcamentos${query ? `?${query}` : ''}`)
  },
  criar: (data: OrcamentoForm) => api.post<Orcamento>('/orcamentos', data),
  atualizar: (id: string, data: Partial<OrcamentoForm>) => api.put<Orcamento>(`/orcamentos/${id}`, data),
  remover: (id: string) => api.del<void>(`/orcamentos/${id}`),
  catalogo: {
    listar: (ativo?: boolean) => api.get<ItemOrcamentoCatalogo[]>(`/orcamentos/catalogo-itens${ativo !== undefined ? `?ativo=${ativo}` : ''}`),
    criar: (data: { nome: string; valor: number }) => api.post<ItemOrcamentoCatalogo>('/orcamentos/catalogo-itens', data),
    atualizar: (id: string, data: Partial<{ nome: string; valor: number; ativo: boolean }>) =>
      api.put<ItemOrcamentoCatalogo>(`/orcamentos/catalogo-itens/${id}`, data),
    remover: (id: string) => api.del<void>(`/orcamentos/catalogo-itens/${id}`),
  },
}
