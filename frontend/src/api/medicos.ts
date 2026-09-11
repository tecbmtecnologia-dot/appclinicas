import { api } from './client'
import type { DisponibilidadeMedico, Medico } from '../types'

export interface MedicoForm {
  nome: string
  crm: string
  especialidade: string
  telefone: string
  email: string
  hospitais?: string[]
  disponibilidade?: Pick<DisponibilidadeMedico, 'dia_semana' | 'hora_inicio' | 'hora_fim'>[]
  intervalo_slot_minutos?: number
}

export const medicosApi = {
  listar: () => api.get<Medico[]>('/medicos'),
  obter: (id: string) => api.get<Medico>(`/medicos/${id}`),
  criar: (data: MedicoForm) => api.post<Medico>('/medicos', data),
  atualizar: (id: string, data: Partial<MedicoForm>) =>
    api.put<Medico>(`/medicos/${id}`, data),
  remover: (id: string) => api.del<void>(`/medicos/${id}`),
}
