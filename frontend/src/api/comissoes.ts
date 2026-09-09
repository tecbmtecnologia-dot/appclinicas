import { api } from './client'
import type { ComissaoAvulsa, MinhaComissao, ParticipanteCirurgiaComissao, ResumoComissoes, Usuario } from '../types'

export const comissoesApi = {
  minhas: (mes: number, ano: number) => api.get<MinhaComissao>(`/comissoes/minhas?mes=${mes}&ano=${ano}`),
  resumo: (mes: number, ano: number) => api.get<ResumoComissoes>(`/comissoes?mes=${mes}&ano=${ano}`),
  usuarios: () => api.get<Pick<Usuario, 'id' | 'nome' | 'role'>[]>('/comissoes/todas-comissionadas'),
  definirFixo: (usuarioId: string, valor_fixo_mensal: number) =>
    api.put<{ usuario_id: string; valor_fixo_mensal: number }>(`/comissoes/${usuarioId}/fixo`, { valor_fixo_mensal }),
  participantes: (cirurgiaId: string) => api.get<ParticipanteCirurgiaComissao[]>(`/comissoes/participantes?cirurgia_id=${cirurgiaId}`),
  adicionarParticipante: (data: { cirurgia_id: string; usuario_id: string; valor_comissao: number }) =>
    api.post<ParticipanteCirurgiaComissao>('/comissoes/participantes', data),
  atualizarParticipante: (id: string, valor_comissao: number) =>
    api.put<ParticipanteCirurgiaComissao>(`/comissoes/participantes/${id}`, { valor_comissao }),
  removerParticipante: (id: string) => api.del<void>(`/comissoes/participantes/${id}`),
  lancar: (data: { usuario_id: string; mes: number; ano: number }) => api.post(`/comissoes/lancar`, data),
  avulsas: {
    listar: (params?: { usuario_id?: string; status?: string }) => {
      const qs = new URLSearchParams()
      if (params?.usuario_id) qs.set('usuario_id', params.usuario_id)
      if (params?.status) qs.set('status', params.status)
      const query = qs.toString()
      return api.get<ComissaoAvulsa[]>(`/comissoes/avulsas${query ? `?${query}` : ''}`)
    },
    criar: (data: {
      data: string
      paciente_nome: string
      nome_cirurgia: string
      descricao?: string
      valor: number
      usuario_id?: string
    }) => api.post<ComissaoAvulsa>('/comissoes/avulsas', data),
    atualizar: (
      id: string,
      data: Partial<{ data: string; paciente_nome: string; nome_cirurgia: string; descricao: string; valor: number }>,
    ) => api.put<ComissaoAvulsa>(`/comissoes/avulsas/${id}`, data),
    remover: (id: string) => api.del<void>(`/comissoes/avulsas/${id}`),
    aprovar: (id: string) => api.put<ComissaoAvulsa>(`/comissoes/avulsas/${id}/aprovar`, {}),
    recusar: (id: string, observacao?: string) => api.put<ComissaoAvulsa>(`/comissoes/avulsas/${id}/recusar`, { observacao }),
  },
}
