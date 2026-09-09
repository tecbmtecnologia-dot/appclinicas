import { api } from './client'
import type { PerfilInstalacao } from '../types'

export const perfisInstalacaoApi = {
  listar: () => api.get<PerfilInstalacao[]>('/perfis-instalacao'),
  criar: (nome: string) => api.post<PerfilInstalacao>('/perfis-instalacao', { nome }),
  atualizar: (id: string, nome: string) => api.put<PerfilInstalacao>(`/perfis-instalacao/${id}`, { nome }),
  remover: (id: string) => api.del<void>(`/perfis-instalacao/${id}`),
}
