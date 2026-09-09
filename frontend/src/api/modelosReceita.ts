import { api } from './client'
import type { ModeloReceita } from '../types'

export interface ModeloReceitaForm {
  nome: string
  texto: string
}

export const modelosReceitaApi = {
  listar: () => api.get<ModeloReceita[]>('/modelos-receita'),
  criar: (data: ModeloReceitaForm) => api.post<ModeloReceita>('/modelos-receita', data),
  atualizar: (id: string, data: Partial<ModeloReceitaForm>) => api.put<ModeloReceita>(`/modelos-receita/${id}`, data),
  remover: (id: string) => api.del<void>(`/modelos-receita/${id}`),
}
