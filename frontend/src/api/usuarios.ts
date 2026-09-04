import { api } from './client'
import type { Role, Usuario } from '../types'

export interface Colega {
  id: string
  nome: string
  role: Role
}

export interface UsuarioForm {
  nome: string
  email: string
  senha?: string
  role: Usuario['role']
  medico_id?: string | null
  unidade_id?: string | null
  carga_horaria_mensal_horas?: number
  ativo?: boolean
}

export const usuariosApi = {
  listar: () => api.get<Usuario[]>('/usuarios'),
  colegas: () => api.get<Colega[]>('/usuarios/colegas'),
  criar: (data: UsuarioForm) => api.post<Usuario>('/usuarios', data),
  atualizar: (id: string, data: Partial<UsuarioForm>) => api.put<Usuario>(`/usuarios/${id}`, data),
  remover: (id: string) => api.del<void>(`/usuarios/${id}`),
}
