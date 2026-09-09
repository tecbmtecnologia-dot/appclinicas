import { api, getToken } from './client'

export interface RelatorioPacientes {
  total: number
}

export interface RelatorioCirurgias {
  total: number
  total_realizadas: number
  por_dia: { data: string; quantidade: number }[]
}

export type PeriodoFinanceiro = 'dia' | 'semana' | 'mes' | 'ano'

export interface RelatorioFinanceiro {
  periodo: PeriodoFinanceiro
  recebiveis: { chave: string; valor: number }[]
  despesas: { chave: string; valor: number }[]
}

async function abrirPdf(path: string) {
  const res = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${getToken() ?? ''}` } })
  if (!res.ok) throw new Error('Não foi possível gerar o PDF.')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

function queryCirurgias(filtro?: { data_inicio?: string; data_fim?: string }) {
  const qs = new URLSearchParams()
  if (filtro?.data_inicio) qs.set('data_inicio', filtro.data_inicio)
  if (filtro?.data_fim) qs.set('data_fim', filtro.data_fim)
  const query = qs.toString()
  return query ? `?${query}` : ''
}

function queryFinanceiro(periodo: PeriodoFinanceiro, filtro?: { data_inicio?: string; data_fim?: string }) {
  const qs = new URLSearchParams({ periodo })
  if (filtro?.data_inicio) qs.set('data_inicio', filtro.data_inicio)
  if (filtro?.data_fim) qs.set('data_fim', filtro.data_fim)
  return qs.toString()
}

export const relatoriosApi = {
  pacientes: () => api.get<RelatorioPacientes>('/relatorios/pacientes'),
  cirurgias: (filtro?: { data_inicio?: string; data_fim?: string }) =>
    api.get<RelatorioCirurgias>(`/relatorios/cirurgias${queryCirurgias(filtro)}`),
  financeiro: (periodo: PeriodoFinanceiro, filtro?: { data_inicio?: string; data_fim?: string }) =>
    api.get<RelatorioFinanceiro>(`/relatorios/financeiro?${queryFinanceiro(periodo, filtro)}`),
  abrirPacientesPdf: () => abrirPdf('/relatorios/pacientes.pdf'),
  abrirCirurgiasPdf: (filtro?: { data_inicio?: string; data_fim?: string }) =>
    abrirPdf(`/relatorios/cirurgias.pdf${queryCirurgias(filtro)}`),
  abrirFinanceiroPdf: (periodo: PeriodoFinanceiro, filtro?: { data_inicio?: string; data_fim?: string }) =>
    abrirPdf(`/relatorios/financeiro.pdf?${queryFinanceiro(periodo, filtro)}`),
}
