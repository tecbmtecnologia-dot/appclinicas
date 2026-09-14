import { api, getToken } from './client'
import type { Ponto, ResumoPonto, ResumoSemanaUsuario, TipoMarcacaoPonto, TipoPonto } from '../types'

export const pontosApi = {
  listar: (params?: { usuario_id?: string; data_inicio?: string; data_fim?: string }) => {
    const qs = new URLSearchParams()
    if (params?.usuario_id) qs.set('usuario_id', params.usuario_id)
    if (params?.data_inicio) qs.set('data_inicio', params.data_inicio)
    if (params?.data_fim) qs.set('data_fim', params.data_fim)
    const query = qs.toString()
    return api.get<Ponto[]>(`/pontos${query ? `?${query}` : ''}`)
  },
  resumo: (mes: number, ano: number) => api.get<ResumoPonto>(`/pontos/resumo?mes=${mes}&ano=${ano}`),
  semana: (usuarioId?: string) =>
    api.get<ResumoSemanaUsuario>(`/pontos/semana${usuarioId ? `?usuario_id=${usuarioId}` : ''}`),
  bater: (dados: { tipo: TipoMarcacaoPonto; latitude?: number; longitude?: number; foto?: Blob | null }) => {
    const formData = new FormData()
    formData.append('tipo', dados.tipo)
    if (dados.latitude != null) formData.append('latitude', String(dados.latitude))
    if (dados.longitude != null) formData.append('longitude', String(dados.longitude))
    if (dados.foto) formData.append('foto', dados.foto, 'selfie.jpg')
    return api.upload<Omit<Ponto, 'tipo'> & { tipo: TipoMarcacaoPonto }>('/pontos', formData)
  },
  lancarManual: (dados: { usuario_id: string; tipo: TipoPonto; data: string; hora: string }) =>
    api.post<Ponto>('/pontos/manual', dados),
  atualizar: (id: string, dados: { data?: string; hora?: string; tipo?: TipoPonto }) =>
    api.put<Ponto>(`/pontos/${id}`, dados),
  abrirFolhaFrequenciaPdf: async (mes: number, ano: number) => {
    const res = await fetch(`/api/pontos/folha-frequencia.pdf?mes=${mes}&ano=${ano}`, {
      headers: { Authorization: `Bearer ${getToken() ?? ''}` },
    })
    if (!res.ok) throw new Error('Não foi possível gerar a folha de frequência.')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  },
}
