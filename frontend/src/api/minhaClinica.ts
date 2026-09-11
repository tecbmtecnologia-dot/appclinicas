import { api } from './client'
import type { Clinica, TipoMarcaDagua, Unidade } from '../types'

export interface MinhaClinicaForm {
  nome: string
  cor_primaria?: string | null
  cnpj?: string | null
  endereco?: string | null
  telefone?: string | null
  email?: string | null
  especialidades?: string[]
  latitude?: number | null
  longitude?: number | null
  raio_metros?: number | null
  marca_dagua_tipo?: TipoMarcaDagua
  marca_dagua_texto?: string | null
}

export interface UnidadeForm {
  nome: string
  endereco?: string | null
  telefone?: string | null
}

export const minhaClinicaApi = {
  obter: () => api.get<Clinica>('/minha-clinica'),
  atualizar: (data: Partial<MinhaClinicaForm>) => api.put<Clinica>('/minha-clinica', data),
  uploadLogo: (arquivo: File) => {
    const formData = new FormData()
    formData.append('logo', arquivo)
    return api.upload<Clinica>('/minha-clinica/logo', formData)
  },
  uploadLogoApp: (arquivo: File) => {
    const formData = new FormData()
    formData.append('logo', arquivo)
    return api.upload<Clinica>('/minha-clinica/logo-app', formData)
  },
  unidades: {
    listar: () => api.get<Unidade[]>('/minha-clinica/unidades'),
    criar: (data: UnidadeForm) => api.post<Unidade>('/minha-clinica/unidades', data),
    atualizar: (id: string, data: Partial<UnidadeForm>) => api.put<Unidade>(`/minha-clinica/unidades/${id}`, data),
    remover: (id: string) => api.del<void>(`/minha-clinica/unidades/${id}`),
  },
}
