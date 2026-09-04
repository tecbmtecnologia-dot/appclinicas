import { api } from './client'
import type { Ponto, ResumoPonto, TipoPonto } from '../types'

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
  bater: (dados: { tipo: TipoPonto; latitude?: number; longitude?: number; foto?: Blob | null }) => {
    const formData = new FormData()
    formData.append('tipo', dados.tipo)
    if (dados.latitude != null) formData.append('latitude', String(dados.latitude))
    if (dados.longitude != null) formData.append('longitude', String(dados.longitude))
    if (dados.foto) formData.append('foto', dados.foto, 'selfie.jpg')
    return api.upload<Ponto>('/pontos', formData)
  },
}
