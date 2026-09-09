import { api } from './client'
import type { ContratoPaciente } from '../types'

export const contratosPacienteApi = {
  listar: (pacienteId: string) => api.get<ContratoPaciente[]>(`/contratos-paciente?paciente_id=${pacienteId}`),
  criar: (pacienteId: string, arquivo: File, descricao?: string) => {
    const formData = new FormData()
    formData.append('paciente_id', pacienteId)
    if (descricao) formData.append('descricao', descricao)
    formData.append('arquivo', arquivo)
    return api.upload<ContratoPaciente>('/contratos-paciente', formData)
  },
  remover: (id: string) => api.del<void>(`/contratos-paciente/${id}`),
}
