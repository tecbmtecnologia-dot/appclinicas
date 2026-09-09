import { api } from './client'
import type { Agendamento } from '../types'

export interface FiltroAgendamentos {
  data?: string
  mes?: string
  medico_id?: string
  paciente_id?: string
}

function buildQuery(filtro?: FiltroAgendamentos) {
  if (!filtro) return ''
  const params = new URLSearchParams()
  if (filtro.data) params.set('data', filtro.data)
  if (filtro.mes) params.set('mes', filtro.mes)
  if (filtro.medico_id) params.set('medico_id', filtro.medico_id)
  if (filtro.paciente_id) params.set('paciente_id', filtro.paciente_id)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const agendamentosApi = {
  listar: (filtro?: FiltroAgendamentos) =>
    api.get<Agendamento[]>(`/agendamentos${buildQuery(filtro)}`),
  obter: (id: string) => api.get<Agendamento>(`/agendamentos/${id}`),
  criar: (data: Omit<Agendamento, 'id' | 'created_at' | 'paciente_nome' | 'medico_nome'>) =>
    api.post<Agendamento>('/agendamentos', data),
  atualizar: (id: string, data: Partial<Agendamento>) =>
    api.put<Agendamento>(`/agendamentos/${id}`, data),
  cancelar: (id: string) =>
    api.put<Agendamento>(`/agendamentos/${id}`, { status: 'cancelado' }),
  remover: (id: string) => api.del<void>(`/agendamentos/${id}`),
}
