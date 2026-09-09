import { api } from './client'
import type { FotoPaciente, TipoFotoPaciente } from '../types'

export const fotosPacienteApi = {
  listar: (pacienteId: string) => api.get<FotoPaciente[]>(`/fotos-paciente?paciente_id=${pacienteId}`),
  criar: (dados: { paciente_id: string; tipo: TipoFotoPaciente; data: string; observacoes?: string; foto: Blob }) => {
    const formData = new FormData()
    formData.append('paciente_id', dados.paciente_id)
    formData.append('tipo', dados.tipo)
    formData.append('data', dados.data)
    if (dados.observacoes) formData.append('observacoes', dados.observacoes)
    formData.append('foto', dados.foto, 'foto.jpg')
    return api.upload<FotoPaciente>('/fotos-paciente', formData)
  },
  remover: (id: string) => api.del<void>(`/fotos-paciente/${id}`),
}
