import { api } from './client'
import type { Medico } from '../types'

export interface MedicoForm {
  nome: string
  crm: string
  especialidade: string
  telefone: string
  email: string
  hospitais?: string[]
}

export const medicosApi = {
  listar: () => api.get<Medico[]>('/medicos'),
  obter: (id: string) => api.get<Medico>(`/medicos/${id}`),
  criar: (data: MedicoForm) => api.post<Medico>('/medicos', data),
  atualizar: (id: string, data: Partial<MedicoForm>) =>
    api.put<Medico>(`/medicos/${id}`, data),
  remover: (id: string) => api.del<void>(`/medicos/${id}`),
}
