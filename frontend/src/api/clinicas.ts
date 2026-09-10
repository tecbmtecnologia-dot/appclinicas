import { api } from './client'
import type { Clinica, Unidade } from '../types'

export interface ClinicaForm {
  nome: string
  logo_url?: string | null
  cor_primaria?: string | null
  cnpj?: string | null
  endereco?: string | null
  especialidades?: string[]
  modulos_opcionais?: string[]
  latitude?: number | null
  longitude?: number | null
  raio_metros?: number | null
  ativo?: boolean
  admin_nome?: string
  admin_email?: string
  admin_senha?: string
}

export interface UnidadeForm {
  nome: string
  endereco?: string | null
  telefone?: string | null
  latitude?: number | null
  longitude?: number | null
  raio_metros?: number | null
}

export const clinicasApi = {
  listar: () => api.get<Clinica[]>('/clinicas'),
  criar: (data: ClinicaForm) => api.post<Clinica>('/clinicas', data),
  atualizar: (id: string, data: Partial<ClinicaForm>) => api.put<Clinica>(`/clinicas/${id}`, data),
  remover: (id: string) => api.del<void>(`/clinicas/${id}`),
  uploadLogo: (id: string, arquivo: File) => {
    const formData = new FormData()
    formData.append('logo', arquivo)
    return api.upload<Clinica>(`/clinicas/${id}/logo`, formData)
  },
  unidades: {
    listar: (clinicaId: string) => api.get<Unidade[]>(`/clinicas/${clinicaId}/unidades`),
    criar: (clinicaId: string, data: UnidadeForm) => api.post<Unidade>(`/clinicas/${clinicaId}/unidades`, data),
    atualizar: (clinicaId: string, id: string, data: Partial<UnidadeForm>) =>
      api.put<Unidade>(`/clinicas/${clinicaId}/unidades/${id}`, data),
    remover: (clinicaId: string, id: string) => api.del<void>(`/clinicas/${clinicaId}/unidades/${id}`),
  },
}
