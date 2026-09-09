import { api } from './client'
import type { Auxiliar } from '../types'

export const auxiliaresApi = {
  listar: () => api.get<Auxiliar[]>('/auxiliares'),
  obter: (id: string) => api.get<Auxiliar>(`/auxiliares/${id}`),
  criar: (data: Omit<Auxiliar, 'id' | 'created_at'>) =>
    api.post<Auxiliar>('/auxiliares', data),
  atualizar: (id: string, data: Partial<Auxiliar>) =>
    api.put<Auxiliar>(`/auxiliares/${id}`, data),
  remover: (id: string) => api.del<void>(`/auxiliares/${id}`),
}
