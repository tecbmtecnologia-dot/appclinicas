import { api } from './client'
import type { Prontuario } from '../types'

export const prontuariosApi = {
  listarPorPaciente: (pacienteId: string) =>
    api.get<Prontuario[]>(`/prontuarios?paciente_id=${pacienteId}`),
  obter: (id: string) => api.get<Prontuario>(`/prontuarios/${id}`),
  criar: (data: Omit<Prontuario, 'id' | 'created_at' | 'medico_nome' | 'paciente_nome'>) =>
    api.post<Prontuario>('/prontuarios', data),
  atualizar: (id: string, data: Partial<Prontuario>) =>
    api.put<Prontuario>(`/prontuarios/${id}`, data),
  remover: (id: string) => api.del<void>(`/prontuarios/${id}`),
}
