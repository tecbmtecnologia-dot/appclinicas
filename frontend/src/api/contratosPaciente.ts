import { api } from './client'
import type { ContratoPaciente } from '../types'

export const contratosPacienteApi = {
  listar: (pacienteId: string) => api.get<ContratoPaciente[]>(`/contratos-paciente?paciente_id=${pacienteId}`),
  criar: (pacienteId: string, arquivo: File, descricao?: string, tipo?: 'contrato' | 'termo_saude') => {
    const formData = new FormData()
    formData.append('paciente_id', pacienteId)
    if (descricao) formData.append('descricao', descricao)
    if (tipo) formData.append('tipo', tipo)
    formData.append('arquivo', arquivo)
    return api.upload<ContratoPaciente>('/contratos-paciente', formData)
  },
  remover: (id: string) => api.del<void>(`/contratos-paciente/${id}`),
}
