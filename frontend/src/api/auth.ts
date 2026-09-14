import { api } from './client'
import type { UsuarioLogado } from '../types'

export interface TentativaLoginMalsucedida {
  email: string
  motivo: 'usuario_nao_encontrado' | 'usuario_inativo' | 'senha_invalida' | 'clinica_inativa'
  ip: string | null
  created_at: string
}

export const authApi = {
  login: (email: string, senha: string) =>
    api.post<{ token: string; usuario: UsuarioLogado }>('/auth/login', { email, senha }),
  me: () => api.get<UsuarioLogado>('/auth/me'),
  tentativasLogin: () => api.get<TentativaLoginMalsucedida[]>('/auth/tentativas-login'),
  atualizarMe: (dados: { nome?: string; email?: string; senha?: string; sexo?: string }) =>
    api.put<UsuarioLogado>('/auth/me', dados),
  enviarFoto: (foto: Blob) => {
    const formData = new FormData()
    formData.append('foto', foto, 'foto.jpg')
    return api.upload<UsuarioLogado>('/auth/me/foto', formData)
  },
}
