import { api, getToken } from './client'
import type { Paciente } from '../types'

export const pacientesApi = {
  listar: () => api.get<Paciente[]>('/pacientes'),
  obter: (id: string) => api.get<Paciente>(`/pacientes/${id}`),
  criar: (data: Omit<Paciente, 'id' | 'created_at'>) =>
    api.post<Paciente>('/pacientes', data),
  atualizar: (id: string, data: Partial<Paciente>) =>
    api.put<Paciente>(`/pacientes/${id}`, data),
  remover: (id: string) => api.del<void>(`/pacientes/${id}`),
  enviarFoto: (id: string, foto: Blob) => {
    const formData = new FormData()
    formData.append('foto', foto, 'foto.jpg')
    return api.upload<Paciente>(`/pacientes/${id}/foto`, formData)
  },
  abrirEtiquetaPdf: async (id: string) => {
    const res = await fetch(`/api/pacientes/${id}/etiqueta.pdf`, {
      headers: { Authorization: `Bearer ${getToken() ?? ''}` },
    })
    if (!res.ok) throw new Error('Não foi possível gerar a etiqueta.')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  },
  abrirPulseiraPdf: async (id: string, formato: 'papel' | 'termica') => {
    const res = await fetch(`/api/pacientes/${id}/pulseira-${formato}.pdf`, {
      headers: { Authorization: `Bearer ${getToken() ?? ''}` },
    })
    if (!res.ok) throw new Error('Não foi possível gerar a pulseira.')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  },
}

export interface EnderecoViaCep {
  cep: string
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

export async function buscarEnderecoPorCep(cep: string): Promise<EnderecoViaCep | null> {
  const limpo = cep.replace(/\D/g, '')
  if (limpo.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`)
    if (!res.ok) return null
    const dados = await res.json()
    if (dados.erro) return null
    return dados
  } catch {
    return null
  }
}
