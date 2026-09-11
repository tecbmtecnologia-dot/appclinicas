import { api, getToken } from './client'

export interface RelatorioPacientes {
  total: number
}

export interface RelatorioCirurgias {
  total: number
  total_realizadas: number
  por_dia: { data: string; quantidade: number }[]
}

export interface RelatorioProducao {
  linhas: { paciente_nome: string; descricao: string; valor: number; data_pagamento: string }[]
  total: number
}

export interface RelatorioContas {
  aReceber: { paciente_nome: string; descricao: string; valor: number; data_vencimento: string | null; status: 'pendente' | 'atrasado' }[]
  aPagar: { descricao: string; categoria: string | null; valor: number; data: string; status: 'pendente' }[]
  totalAReceber: number
  totalAPagar: number
}

export interface RelatorioAnaliseFinanceira {
  ano: number
  meses: { mes: string; nome: string; receitas: number; despesas: number; saldo: number }[]
  totalReceitas: number
  totalDespesas: number
  totalSaldo: number
}

export interface RelatorioEpidemiologico {
  total: number
  porSexo: { rotulo: string; quantidade: number }[]
  porFaixaEtaria: { rotulo: string; quantidade: number }[]
  porProcedimento: { rotulo: string; quantidade: number }[]
}

export interface LinhaAgendamentoRelatorio {
  paciente_nome: string
  medico_nome: string
  data_hora: string
  procedimento: string
}

export interface RelatorioAbsenteismo {
  linhas: LinhaAgendamentoRelatorio[]
  total: number
  totalRelevante: number
  taxa: number
}

export interface RelatorioCancelamento {
  linhas: LinhaAgendamentoRelatorio[]
  total: number
  totalGeral: number
  taxa: number
}

export interface RelatorioConsultasProcedimentos {
  total: number
  porProcedimento: { rotulo: string; quantidade: number }[]
}

export interface RelatorioVendasProfissional {
  total: number
  porProfissional: { rotulo: string; quantidade: number }[]
}

export interface ResumoRepasseProfissional {
  usuario_id: string
  usuario_nome: string
  role: string
  valor_fixo_mensal: number
  total_procedimentos: number
  total_avulsas_aprovadas: number
  total: number
}

export interface RelatorioRepasse {
  referencia: string
  resumo: ResumoRepasseProfissional[]
  totalGeral: number
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

function queryPeriodo(filtro?: { data_inicio?: string; data_fim?: string }) {
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
  absenteismo: (filtro?: { data_inicio?: string; data_fim?: string }) =>
    api.get<RelatorioAbsenteismo>(`/relatorios/absenteismo${queryPeriodo(filtro)}`),
  abrirAbsenteismoPdf: (filtro?: { data_inicio?: string; data_fim?: string }) =>
    abrirPdf(`/relatorios/absenteismo.pdf${queryPeriodo(filtro)}`),
  cancelamento: (filtro?: { data_inicio?: string; data_fim?: string }) =>
    api.get<RelatorioCancelamento>(`/relatorios/cancelamento${queryPeriodo(filtro)}`),
  abrirCancelamentoPdf: (filtro?: { data_inicio?: string; data_fim?: string }) =>
    abrirPdf(`/relatorios/cancelamento.pdf${queryPeriodo(filtro)}`),
  consultasProcedimentos: (filtro?: { data_inicio?: string; data_fim?: string }) =>
    api.get<RelatorioConsultasProcedimentos>(`/relatorios/consultas-procedimentos${queryPeriodo(filtro)}`),
  abrirConsultasProcedimentosPdf: (filtro?: { data_inicio?: string; data_fim?: string }) =>
    abrirPdf(`/relatorios/consultas-procedimentos.pdf${queryPeriodo(filtro)}`),
  vendasProfissional: (filtro?: { data_inicio?: string; data_fim?: string }) =>
    api.get<RelatorioVendasProfissional>(`/relatorios/vendas-profissional${queryPeriodo(filtro)}`),
  abrirVendasProfissionalPdf: (filtro?: { data_inicio?: string; data_fim?: string }) =>
    abrirPdf(`/relatorios/vendas-profissional.pdf${queryPeriodo(filtro)}`),
  repasse: (mes: number, ano: number) => api.get<RelatorioRepasse>(`/relatorios/repasse?mes=${mes}&ano=${ano}`),
  abrirRepassePdf: (mes: number, ano: number) => abrirPdf(`/relatorios/repasse.pdf?mes=${mes}&ano=${ano}`),
  epidemiologico: (filtro?: { data_inicio?: string; data_fim?: string }) =>
    api.get<RelatorioEpidemiologico>(`/relatorios/epidemiologico${queryPeriodo(filtro)}`),
  abrirEpidemiologicoPdf: (filtro?: { data_inicio?: string; data_fim?: string }) =>
    abrirPdf(`/relatorios/epidemiologico.pdf${queryPeriodo(filtro)}`),
  analiseFinanceira: (ano: number) => api.get<RelatorioAnaliseFinanceira>(`/relatorios/analise-financeira?ano=${ano}`),
  abrirAnaliseFinanceiraPdf: (ano: number) => abrirPdf(`/relatorios/analise-financeira.pdf?ano=${ano}`),
  contas: (filtro?: { data_inicio?: string; data_fim?: string }) =>
    api.get<RelatorioContas>(`/relatorios/contas${queryPeriodo(filtro)}`),
  abrirContasPdf: (filtro?: { data_inicio?: string; data_fim?: string }) =>
    abrirPdf(`/relatorios/contas.pdf${queryPeriodo(filtro)}`),
  producao: (filtro?: { data_inicio?: string; data_fim?: string }) =>
    api.get<RelatorioProducao>(`/relatorios/producao${queryPeriodo(filtro)}`),
  abrirProducaoPdf: (filtro?: { data_inicio?: string; data_fim?: string }) =>
    abrirPdf(`/relatorios/producao.pdf${queryPeriodo(filtro)}`),
  cirurgias: (filtro?: { data_inicio?: string; data_fim?: string }) =>
    api.get<RelatorioCirurgias>(`/relatorios/cirurgias${queryPeriodo(filtro)}`),
  financeiro: (periodo: PeriodoFinanceiro, filtro?: { data_inicio?: string; data_fim?: string }) =>
    api.get<RelatorioFinanceiro>(`/relatorios/financeiro?${queryFinanceiro(periodo, filtro)}`),
  abrirPacientesPdf: () => abrirPdf('/relatorios/pacientes.pdf'),
  abrirCirurgiasPdf: (filtro?: { data_inicio?: string; data_fim?: string }) =>
    abrirPdf(`/relatorios/cirurgias.pdf${queryPeriodo(filtro)}`),
  abrirFinanceiroPdf: (periodo: PeriodoFinanceiro, filtro?: { data_inicio?: string; data_fim?: string }) =>
    abrirPdf(`/relatorios/financeiro.pdf?${queryFinanceiro(periodo, filtro)}`),
}
