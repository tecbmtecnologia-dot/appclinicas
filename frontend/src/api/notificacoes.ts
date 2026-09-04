import { api } from './client'
import type { Notificacao } from '../types'

export const notificacoesApi = {
  listar: () => api.get<Notificacao[]>('/notificacoes'),
  marcarLida: (id: string) => api.put<Notificacao>(`/notificacoes/${id}/lida`, {}),
  marcarTodasLidas: () => api.put<void>('/notificacoes/lidas', {}),
}
