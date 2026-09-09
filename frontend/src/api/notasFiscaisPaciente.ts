import { api } from './client'
import type { NotaFiscalPaciente } from '../types'

export const notasFiscaisPacienteApi = {
  listar: (pacienteId: string) => api.get<NotaFiscalPaciente[]>(`/notas-fiscais-paciente?paciente_id=${pacienteId}`),
  criar: (pacienteId: string, arquivo: File, descricao?: string) => {
    const formData = new FormData()
    formData.append('paciente_id', pacienteId)
    if (descricao) formData.append('descricao', descricao)
    formData.append('arquivo', arquivo)
    return api.upload<NotaFiscalPaciente>('/notas-fiscais-paciente', formData)
  },
  remover: (id: string) => api.del<void>(`/notas-fiscais-paciente/${id}`),
}
