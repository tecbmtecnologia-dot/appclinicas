import { api } from './client'
import type { Compromisso } from '../types'

export interface FiltroCompromissos {
  data?: string
  mes?: string
  medico_id?: string
}

function buildQuery(filtro?: FiltroCompromissos) {
  if (!filtro) return ''
  const params = new URLSearchParams()
  if (filtro.data) params.set('data', filtro.data)
  if (filtro.mes) params.set('mes', filtro.mes)
  if (filtro.medico_id) params.set('medico_id', filtro.medico_id)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const compromissosApi = {
  listar: (filtro?: FiltroCompromissos) => api.get<Compromisso[]>(`/compromissos${buildQuery(filtro)}`),
  criar: (data: { medico_id: string; titulo: string; data_hora: string; observacoes?: string }) =>
    api.post<Compromisso>('/compromissos', data),
  atualizar: (id: string, data: Partial<{ medico_id: string; titulo: string; data_hora: string; observacoes: string }>) =>
    api.put<Compromisso>(`/compromissos/${id}`, data),
  remover: (id: string) => api.del<void>(`/compromissos/${id}`),
}
