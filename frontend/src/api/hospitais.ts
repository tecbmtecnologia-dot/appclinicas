import { api } from './client'
import type { Hospital } from '../types'

export const hospitaisApi = {
  listar: () => api.get<Hospital[]>('/hospitais'),
  obter: (id: string) => api.get<Hospital>(`/hospitais/${id}`),
  criar: (data: Omit<Hospital, 'id' | 'created_at'>) =>
    api.post<Hospital>('/hospitais', data),
  atualizar: (id: string, data: Partial<Hospital>) =>
    api.put<Hospital>(`/hospitais/${id}`, data),
  remover: (id: string) => api.del<void>(`/hospitais/${id}`),
}
