import { api, getToken } from './client'
import type { PedidoExameResumo, Prontuario, ReceitaResumo } from '../types'

export const prontuariosApi = {
  listarPorPaciente: (pacienteId: string) =>
    api.get<Prontuario[]>(`/prontuarios?paciente_id=${pacienteId}`),
  obter: (id: string) => api.get<Prontuario>(`/prontuarios/${id}`),
  listarReceitasPorPaciente: (pacienteId: string) =>
    api.get<ReceitaResumo[]>(`/prontuarios/paciente/${pacienteId}/receitas`),
  listarPedidosExamePorPaciente: (pacienteId: string) =>
    api.get<PedidoExameResumo[]>(`/prontuarios/paciente/${pacienteId}/pedidos-exames`),
  criar: (data: Omit<Prontuario, 'id' | 'created_at' | 'medico_nome' | 'paciente_nome'>) =>
    api.post<Prontuario>('/prontuarios', data),
  atualizar: (id: string, data: Partial<Prontuario>) =>
    api.put<Prontuario>(`/prontuarios/${id}`, data),
  remover: (id: string) => api.del<void>(`/prontuarios/${id}`),
  abrirReceitaPdf: async (id: string) => {
    const res = await fetch(`/api/prontuarios/${id}/receita.pdf`, {
      headers: { Authorization: `Bearer ${getToken() ?? ''}` },
    })
    if (!res.ok) throw new Error('Não foi possível gerar a receita.')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  },
  abrirPedidoExamesPdf: async (id: string) => {
    const res = await fetch(`/api/prontuarios/${id}/pedido-exames.pdf`, {
      headers: { Authorization: `Bearer ${getToken() ?? ''}` },
    })
    if (!res.ok) throw new Error('Não foi possível gerar o pedido de exames.')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  },
  abrirHistoricoPdf: async (pacienteId: string) => {
    const res = await fetch(`/api/prontuarios/paciente/${pacienteId}/historico.pdf`, {
      headers: { Authorization: `Bearer ${getToken() ?? ''}` },
    })
    if (!res.ok) throw new Error('Não foi possível gerar o histórico.')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  },
}
