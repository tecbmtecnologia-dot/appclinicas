import { api } from './client'
import type { ItemCirurgia } from '../types'

export interface ItemCirurgiaForm {
  nome: string
}

export const itensCirurgiaApi = {
  listar: () => api.get<ItemCirurgia[]>('/itens-cirurgia'),
  criar: (data: ItemCirurgiaForm) => api.post<ItemCirurgia>('/itens-cirurgia', data),
  atualizar: (id: string, data: Partial<ItemCirurgiaForm>) => api.put<ItemCirurgia>(`/itens-cirurgia/${id}`, data),
  remover: (id: string) => api.del<void>(`/itens-cirurgia/${id}`),
}
