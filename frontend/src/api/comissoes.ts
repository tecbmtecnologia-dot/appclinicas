import { api } from './client'
import type { ComissaoAvulsa, ComissaoExtra, MinhaComissao, ParticipanteCirurgiaComissao, ResumoComissoes, Usuario } from '../types'

export const comissoesApi = {
  minhas: (mes: number, ano: number) => api.get<MinhaComissao>(`/comissoes/minhas?mes=${mes}&ano=${ano}`),
  resumo: (mes: number, ano: number) => api.get<ResumoComissoes>(`/comissoes?mes=${mes}&ano=${ano}`),
  usuarios: () => api.get<Pick<Usuario, 'id' | 'nome' | 'role'>[]>('/comissoes/todas-comissionadas'),
  definirFixo: (usuarioId: string, valor_fixo_mensal: number) =>
    api.put<{ usuario_id: string; valor_fixo_mensal: number }>(`/comissoes/${usuarioId}/fixo`, { valor_fixo_mensal }),
  participantes: (cirurgiaId: string) => api.get<ParticipanteCirurgiaComissao[]>(`/comissoes/participantes?cirurgia_id=${cirurgiaId}`),
  participantesPendentes: () => api.get<ParticipanteCirurgiaComissao[]>('/comissoes/participantes/pendentes'),
  adicionarParticipante: (data: { cirurgia_id: string; usuario_id?: string; valor_comissao: number }) =>
    api.post<ParticipanteCirurgiaComissao>('/comissoes/participantes', data),
  atualizarParticipante: (id: string, data: { valor_comissao?: number; observacao?: string }) =>
    api.put<ParticipanteCirurgiaComissao>(`/comissoes/participantes/${id}`, data),
  aprovarParticipante: (id: string, data?: { valor_comissao?: number; observacao?: string }) =>
    api.put<ParticipanteCirurgiaComissao>(`/comissoes/participantes/${id}/aprovar`, data ?? {}),
  recusarParticipante: (id: string, observacao?: string) =>
    api.put<ParticipanteCirurgiaComissao>(`/comissoes/participantes/${id}/recusar`, { observacao }),
  removerParticipante: (id: string) => api.del<void>(`/comissoes/participantes/${id}`),
  removerMinhaParticipante: (id: string) => api.del<void>(`/comissoes/participantes/${id}/meu`),
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
  extras: {
    listar: (params?: { usuario_id?: string; status?: string }) => {
      const qs = new URLSearchParams()
      if (params?.usuario_id) qs.set('usuario_id', params.usuario_id)
      if (params?.status) qs.set('status', params.status)
      const query = qs.toString()
      return api.get<ComissaoExtra[]>(`/comissoes/extras${query ? `?${query}` : ''}`)
    },
    pendentes: () => api.get<ComissaoExtra[]>('/comissoes/extras/pendentes'),
    criar: (data: { data: string; descricao: string; valor: number; usuario_id?: string }) =>
      api.post<ComissaoExtra>('/comissoes/extras', data),
    atualizar: (id: string, data: Partial<{ data: string; descricao: string; valor: number }>) =>
      api.put<ComissaoExtra>(`/comissoes/extras/${id}`, data),
    remover: (id: string) => api.del<void>(`/comissoes/extras/${id}`),
    aprovar: (id: string, data?: { valor?: number; observacao?: string }) =>
      api.put<ComissaoExtra>(`/comissoes/extras/${id}/aprovar`, data ?? {}),
    recusar: (id: string, observacao?: string) => api.put<ComissaoExtra>(`/comissoes/extras/${id}/recusar`, { observacao }),
  },
}
