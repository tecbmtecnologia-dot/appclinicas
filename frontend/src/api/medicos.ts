import { api } from './client'
import type { Medico } from '../types'

export const medicosApi = {
  listar: () => api.get<Medico[]>('/medicos'),
  obter: (id: string) => api.get<Medico>(`/medicos/${id}`),
  criar: (data: Omit<Medico, 'id' | 'created_at'>) =>
    api.post<Medico>('/medicos', data),
  atualizar: (id: string, data: Partial<Medico>) =>
    api.put<Medico>(`/medicos/${id}`, data),
  remover: (id: string) => api.del<void>(`/medicos/${id}`),
}
