import { api, getToken } from './client'
import type { Cirurgia } from '../types'

export interface CirurgiaForm {
  paciente_id: string
  medico_id?: string | null
  nome_cirurgia: string
  data_prevista?: string | null
  hospital_id?: string | null
  local_hospital?: string | null
  equipe?: string | null
  observacoes?: string | null
  auxiliares?: string[]
  itens?: { item_id: string; quantidade: number }[]
}

export const cirurgiasApi = {
  listar: (params?: { paciente_id?: string; status?: string }) => {
    const qs = new URLSearchParams()
    if (params?.paciente_id) qs.set('paciente_id', params.paciente_id)
    if (params?.status) qs.set('status', params.status)
    const query = qs.toString()
    return api.get<Cirurgia[]>(`/cirurgias${query ? `?${query}` : ''}`)
  },
  obter: (id: string) => api.get<Cirurgia>(`/cirurgias/${id}`),
  criar: (data: CirurgiaForm) => api.post<Cirurgia>('/cirurgias', data),
  atualizar: (id: string, data: Partial<CirurgiaForm>) => api.put<Cirurgia>(`/cirurgias/${id}`, data),
  finalizar: (id: string) => api.put<Cirurgia>(`/cirurgias/${id}/finalizar`, {}),
  remover: (id: string) => api.del<void>(`/cirurgias/${id}`),
  abrirRelatorioPdf: async (id: string) => {
    const res = await fetch(`/api/cirurgias/${id}/relatorio.pdf`, {
      headers: { Authorization: `Bearer ${getToken() ?? ''}` },
    })
    if (!res.ok) throw new Error('Não foi possível gerar o relatório.')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  },
}
