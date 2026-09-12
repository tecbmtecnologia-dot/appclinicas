import { api } from './client'
import type { ModeloExame } from '../types'

export interface ModeloExameForm {
  nome: string
  texto: string
}

export const modelosExameApi = {
  listar: () => api.get<ModeloExame[]>('/modelos-exame'),
  criar: (data: ModeloExameForm) => api.post<ModeloExame>('/modelos-exame', data),
  atualizar: (id: string, data: Partial<ModeloExameForm>) => api.put<ModeloExame>(`/modelos-exame/${id}`, data),
  remover: (id: string) => api.del<void>(`/modelos-exame/${id}`),
}
