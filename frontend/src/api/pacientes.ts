import { api } from './client'
import type { Paciente } from '../types'

export const pacientesApi = {
  listar: () => api.get<Paciente[]>('/pacientes'),
  obter: (id: string) => api.get<Paciente>(`/pacientes/${id}`),
  criar: (data: Omit<Paciente, 'id' | 'created_at'>) =>
    api.post<Paciente>('/pacientes', data),
  atualizar: (id: string, data: Partial<Paciente>) =>
    api.put<Paciente>(`/pacientes/${id}`, data),
  remover: (id: string) => api.del<void>(`/pacientes/${id}`),
}
