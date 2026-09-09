import { api } from './client'
import type { SessaoFisioterapia } from '../types'

export interface FiltroSessoesFisioterapia {
  data?: string
  mes?: string
  paciente_id?: string
}

export interface SessaoFisioterapiaForm {
  paciente_id: string
  data_hora: string
  observacoes: string
}

function buildQuery(filtro?: FiltroSessoesFisioterapia) {
  if (!filtro) return ''
  const params = new URLSearchParams()
  if (filtro.data) params.set('data', filtro.data)
  if (filtro.mes) params.set('mes', filtro.mes)
  if (filtro.paciente_id) params.set('paciente_id', filtro.paciente_id)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const sessoesFisioterapiaApi = {
  listar: (filtro?: FiltroSessoesFisioterapia) => api.get<SessaoFisioterapia[]>(`/sessoes-fisioterapia${buildQuery(filtro)}`),
  criar: (data: SessaoFisioterapiaForm) => api.post<SessaoFisioterapia>('/sessoes-fisioterapia', data),
  atualizar: (id: string, data: Partial<SessaoFisioterapiaForm>) =>
    api.put<SessaoFisioterapia>(`/sessoes-fisioterapia/${id}`, data),
  remover: (id: string) => api.del<void>(`/sessoes-fisioterapia/${id}`),
}
