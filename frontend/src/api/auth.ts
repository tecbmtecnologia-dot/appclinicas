import { api } from './client'
import type { UsuarioLogado } from '../types'

export const authApi = {
  login: (email: string, senha: string, lembrar: boolean) =>
    api.post<{ token: string; usuario: UsuarioLogado }>('/auth/login', { email, senha, lembrar }),
  me: () => api.get<UsuarioLogado>('/auth/me'),
  atualizarMe: (dados: { nome?: string; email?: string; senha?: string }) =>
    api.put<UsuarioLogado>('/auth/me', dados),
}
