import { api } from './client'
import type { Reuniao, StatusReuniao } from '../types'

export interface ReuniaoForm {
  titulo: string
  pauta?: string | null
  data_hora: string
  participantes: string[]
  status?: StatusReuniao
}

export const reunioesApi = {
  listar: () => api.get<Reuniao[]>('/reunioes'),
  obter: (id: string) => api.get<Reuniao>(`/reunioes/${id}`),
  criar: (data: ReuniaoForm) => api.post<Reuniao>('/reunioes', data),
  atualizar: (id: string, data: Partial<ReuniaoForm>) => api.put<Reuniao>(`/reunioes/${id}`, data),
  encerrar: (id: string) => api.put<Reuniao>(`/reunioes/${id}/encerrar`, {}),
  remover: (id: string) => api.del<void>(`/reunioes/${id}`),
}
