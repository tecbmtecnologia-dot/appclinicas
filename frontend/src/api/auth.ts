import { api } from './client'
import type { UsuarioLogado } from '../types'

export const authApi = {
  login: (email: string, senha: string) =>
    api.post<{ token: string; usuario: UsuarioLogado }>('/auth/login', { email, senha }),
  me: () => api.get<UsuarioLogado>('/auth/me'),
}
