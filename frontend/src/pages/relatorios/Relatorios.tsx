import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftRight,
  BarChart3,
  Banknote,
  CalendarX,
  ClipboardList,
  FileDown,
  LineChart,
  Receipt,
  Scissors,
  Stethoscope,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react'
import { Badge, Button, Card, Input, Label, PageHeader, Select } from '../../components/ui'
import {
  relatoriosApi,
  type LinhaAgendamentoRelatorio,
  type PeriodoFinanceiro,
  type RelatorioAbsenteismo,
  type RelatorioAnaliseFinanceira,
  type RelatorioCancelamento,
  type RelatorioCirurgias,
  type RelatorioConsultasProcedimentos,
  type RelatorioContas,
  type RelatorioEpidemiologico,
  type RelatorioFinanceiro,
  type RelatorioPacientes,
  type RelatorioProducao,
  type RelatorioRepasse,
  type RelatorioVendasProfissional,
} from '../../api/relatorios'

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const ROTULOS_PERIODO: Record<PeriodoFinanceiro, string> = {
  dia: 'Por dia',
  semana: 'Por semana',
  mes: 'Por mês',
  ano: 'Por ano',
}

const NOMES_MES_CURTO = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function TabelaAgendamentos({ linhas }: { linhas: LinhaAgendamentoRelatorio[] }) {
  if (linhas.length === 0) return <p className="text-sm text-slate-400">Nenhum registro no período.</p>
  return (
    <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 max-h-80 overflow-y-auto">
      {linhas.map((l, i) => (
        <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="font-medium text-slate-800 truncate">{l.paciente_nome}</p>
            <p className="text-xs text-slate-400 truncate">
              Dr(a). {l.medico_nome} · {l.procedimento}
            </p>
          </div>
          <span className="text-xs text-slate-500 shrink-0">
            {new Date(l.data_hora.replace(' ', 'T')).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ))}
    </div>
  )
}

function TabelaDistribuicao({ linhas, total }: { linhas: { rotulo: string; quantidade: number }[]; total: number }) {
  if (linhas.length === 0) return <p className="text-sm text-slate-400">Nenhum atendimento no período.</p>
  return (
    <div className="border border-slate-100 rounded-lg divide-y divide-slate-100">
      {linhas.map((l) => (
        <div key={l.rotulo} className="flex items-center justify-between px-3 py-1.5 text-sm gap-2">
          <span className="text-slate-600 truncate">{l.rotulo}</span>
          <span className="font-medium text-slate-800 shrink-0">
            {l.quantidade} {total > 0 ? `(${((l.quantidade / total) * 100).toFixed(0)}%)` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function Relatorios() {
  const [pacientes, setPacientes] = useState<RelatorioPacientes | null>(null)

  const [anoAnalise, setAnoAnalise] = useState(new Date().getFullYear())
  const [analiseFinanceira, setAnaliseFinanceira] = useState<RelatorioAnaliseFinanceira | null>(null)

  const [producaoInicio, setProducaoInicio] = useState('')
  const [producaoFim, setProducaoFim] = useState('')
  const [producao, setProducao] = useState<RelatorioProducao | null>(null)

  const [contasInicio, setContasInicio] = useState('')
  const [contasFim, setContasFim] = useState('')
  const [contas, setContas] = useState<RelatorioContas | null>(null)

  const [cirurgiasInicio, setCirurgiasInicio] = useState('')
  const [cirurgiasFim, setCirurgiasFim] = useState('')
  const [cirurgias, setCirurgias] = useState<RelatorioCirurgias | null>(null)

  const [epiInicio, setEpiInicio] = useState('')
  const [epiFim, setEpiFim] = useState('')
  const [epi, setEpi] = useState<RelatorioEpidemiologico | null>(null)

  const [absInicio, setAbsInicio] = useState('')
  const [absFim, setAbsFim] = useState('')
  const [absenteismo, setAbsenteismo] = useState<RelatorioAbsenteismo | null>(null)

  const [cancInicio, setCancInicio] = useState('')
  const [cancFim, setCancFim] = useState('')
  const [cancelamento, setCancelamento] = useState<RelatorioCancelamento | null>(null)

  const [cpInicio, setCpInicio] = useState('')
  const [cpFim, setCpFim] = useState('')
  const [consultasProcedimentos, setConsultasProcedimentos] = useState<RelatorioConsultasProcedimentos | null>(null)

  const [vpInicio, setVpInicio] = useState('')
  const [vpFim, setVpFim] = useState('')
  const [vendasProfissional, setVendasProfissional] = useState<RelatorioVendasProfissional | null>(null)

  const hoje = new Date()
  const [repasseMes, setRepasseMes] = useState(hoje.getMonth() + 1)
  const [repasseAno, setRepasseAno] = useState(hoje.getFullYear())
  const [repasse, setRepasse] = useState<RelatorioRepasse | null>(null)

  const [periodo, setPeriodo] = useState<PeriodoFinanceiro>('mes')
  const [financeiroInicio, setFinanceiroInicio] = useState('')
  const [financeiroFim, setFinanceiroFim] = useState('')
  const [financeiro, setFinanceiro] = useState<RelatorioFinanceiro | null>(null)

  useEffect(() => {
    relatoriosApi.pacientes().then(setPacientes).catch(() => {})
  }, [])

  useEffect(() => {
    relatoriosApi.analiseFinanceira(anoAnalise).then(setAnaliseFinanceira).catch(() => {})
  }, [anoAnalise])

  useEffect(() => {
    relatoriosApi
      .producao({ data_inicio: producaoInicio || undefined, data_fim: producaoFim || undefined })
      .then(setProducao)
      .catch(() => {})
  }, [producaoInicio, producaoFim])

  useEffect(() => {
    relatoriosApi
      .contas({ data_inicio: contasInicio || undefined, data_fim: contasFim || undefined })
      .then(setContas)
      .catch(() => {})
  }, [contasInicio, contasFim])

  useEffect(() => {
    relatoriosApi
      .cirurgias({ data_inicio: cirurgiasInicio || undefined, data_fim: cirurgiasFim || undefined })
      .then(setCirurgias)
      .catch(() => {})
  }, [cirurgiasInicio, cirurgiasFim])

  useEffect(() => {
    relatoriosApi
      .financeiro(periodo, { data_inicio: financeiroInicio || undefined, data_fim: financeiroFim || undefined })
      .then(setFinanceiro)
      .catch(() => {})
  }, [periodo, financeiroInicio, financeiroFim])

  useEffect(() => {
    relatoriosApi
      .epidemiologico({ data_inicio: epiInicio || undefined, data_fim: epiFim || undefined })
      .then(setEpi)
      .catch(() => {})
  }, [epiInicio, epiFim])

  useEffect(() => {
    relatoriosApi
      .absenteismo({ data_inicio: absInicio || undefined, data_fim: absFim || undefined })
      .then(setAbsenteismo)
      .catch(() => {})
  }, [absInicio, absFim])

  useEffect(() => {
    relatoriosApi
      .cancelamento({ data_inicio: cancInicio || undefined, data_fim: cancFim || undefined })
      .then(setCancelamento)
      .catch(() => {})
  }, [cancInicio, cancFim])

  useEffect(() => {
    relatoriosApi
      .consultasProcedimentos({ data_inicio: cpInicio || undefined, data_fim: cpFim || undefined })
      .then(setConsultasProcedimentos)
      .catch(() => {})
  }, [cpInicio, cpFim])

  useEffect(() => {
    relatoriosApi
      .vendasProfissional({ data_inicio: vpInicio || undefined, data_fim: vpFim || undefined })
      .then(setVendasProfissional)
      .catch(() => {})
  }, [vpInicio, vpFim])

  useEffect(() => {
    relatoriosApi.repasse(repasseMes, repasseAno).then(setRepasse).catch(() => {})
  }, [repasseMes, repasseAno])

  const totalRecebiveis = useMemo(() => financeiro?.recebiveis.reduce((s, r) => s + r.valor, 0) ?? 0, [financeiro])
  const totalDespesas = useMemo(() => financeiro?.despesas.reduce((s, r) => s + r.valor, 0) ?? 0, [financeiro])

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Visão geral da clínica — só admin" icon={BarChart3} />

      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <LineChart className="h-4 w-4" strokeWidth={2} />
            </span>
            <h2 className="font-semibold text-slate-800">Análise financeira da empresa</h2>
          </div>
          <Button variant="secondary" onClick={() => relatoriosApi.abrirAnaliseFinanceiraPdf(anoAnalise).catch(() => alert('Erro ao gerar o PDF.'))}>
            <FileDown className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
        <p className="text-xs text-slate-400 mb-3">Total de receitas e despesas já realizadas, mês a mês, ao longo do ano.</p>
        <div className="mb-3 max-w-[140px]">
          <Label>Ano</Label>
          <Input type="number" value={anoAnalise} onChange={(e) => setAnoAnalise(Number(e.target.value))} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="py-1.5 font-medium">Mês</th>
                <th className="py-1.5 font-medium text-right">Receitas</th>
                <th className="py-1.5 font-medium text-right">Despesas</th>
                <th className="py-1.5 font-medium text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(analiseFinanceira?.meses ?? []).map((m) => (
                <tr key={m.mes}>
                  <td className="py-1.5 text-slate-600">{m.nome}</td>
                  <td className="py-1.5 text-right text-slate-800">{moeda(m.receitas)}</td>
                  <td className="py-1.5 text-right text-slate-800">{moeda(m.despesas)}</td>
                  <td className={`py-1.5 text-right font-medium ${m.saldo < 0 ? 'text-red-700' : 'text-slate-800'}`}>{moeda(m.saldo)}</td>
                </tr>
              ))}
            </tbody>
            {analiseFinanceira && (
              <tfoot>
                <tr className="border-t border-slate-200 font-bold">
                  <td className="py-2 text-slate-800">Total do ano</td>
                  <td className="py-2 text-right text-emerald-700">{moeda(analiseFinanceira.totalReceitas)}</td>
                  <td className="py-2 text-right text-red-700">{moeda(analiseFinanceira.totalDespesas)}</td>
                  <td className={`py-2 text-right ${analiseFinanceira.totalSaldo < 0 ? 'text-red-700' : 'text-brand-700'}`}>
                    {moeda(analiseFinanceira.totalSaldo)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Users className="h-4 w-4" strokeWidth={2} />
              </span>
              <h2 className="font-semibold text-slate-800">Total de pacientes</h2>
            </div>
            <Button
              variant="secondary"
              onClick={() => relatoriosApi.abrirPacientesPdf().catch(() => alert('Erro ao gerar o PDF.'))}
            >
              <FileDown className="h-3.5 w-3.5" /> PDF
            </Button>
          </div>
          <p className="text-3xl font-bold text-slate-900">{pacientes?.total ?? '—'}</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Scissors className="h-4 w-4" strokeWidth={2} />
              </span>
              <h2 className="font-semibold text-slate-800">Cirurgias</h2>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                relatoriosApi
                  .abrirCirurgiasPdf({ data_inicio: cirurgiasInicio || undefined, data_fim: cirurgiasFim || undefined })
                  .catch(() => alert('Erro ao gerar o PDF.'))
              }
            >
              <FileDown className="h-3.5 w-3.5" /> PDF
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label>De</Label>
              <Input type="date" value={cirurgiasInicio} onChange={(e) => setCirurgiasInicio(e.target.value)} />
            </div>
            <div>
              <Label>Até</Label>
              <Input type="date" value={cirurgiasFim} onChange={(e) => setCirurgiasFim(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-6 mb-3">
            <div>
              <p className="text-2xl font-bold text-slate-900">{cirurgias?.total ?? '—'}</p>
              <p className="text-xs text-slate-400">Total no período</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{cirurgias?.total_realizadas ?? '—'}</p>
              <p className="text-xs text-slate-400">Com relatório finalizado</p>
            </div>
          </div>
          {cirurgias && cirurgias.por_dia.length > 0 && (
            <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100">
              {cirurgias.por_dia.map((d) => (
                <div key={d.data} className="flex items-center justify-between px-3 py-1.5 text-sm">
                  <span className="text-slate-600">{d.data}</span>
                  <span className="font-medium text-slate-800">{d.quantidade}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <Receipt className="h-4 w-4" strokeWidth={2} />
            </span>
            <h2 className="font-semibold text-slate-800">Produção realizada</h2>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              relatoriosApi
                .abrirProducaoPdf({ data_inicio: producaoInicio || undefined, data_fim: producaoFim || undefined })
                .catch(() => alert('Erro ao gerar o PDF.'))
            }
          >
            <FileDown className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Pagamentos já recebidos no período, com paciente e o procedimento/consulta descrito no lançamento.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3 max-w-md">
          <div>
            <Label>De</Label>
            <Input type="date" value={producaoInicio} onChange={(e) => setProducaoInicio(e.target.value)} />
          </div>
          <div>
            <Label>Até</Label>
            <Input type="date" value={producaoFim} onChange={(e) => setProducaoFim(e.target.value)} />
          </div>
        </div>

        {producao && producao.linhas.length > 0 ? (
          <>
            <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {producao.linhas.map((l, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{l.paciente_nome}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {l.descricao} · {new Date(`${l.data_pagamento}T00:00:00`).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="font-semibold text-slate-800 shrink-0">{moeda(l.valor)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-2">
              <span className="text-sm font-bold text-emerald-700">Total: {moeda(producao.total)}</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">Nenhum pagamento recebido no período.</p>
        )}
      </Card>

      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <ArrowLeftRight className="h-4 w-4" strokeWidth={2} />
            </span>
            <h2 className="font-semibold text-slate-800">Contas a pagar e a receber</h2>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              relatoriosApi
                .abrirContasPdf({ data_inicio: contasInicio || undefined, data_fim: contasFim || undefined })
                .catch(() => alert('Erro ao gerar o PDF.'))
            }
          >
            <FileDown className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          O que ainda está em aberto (pendente ou atrasado), filtrado pela data de vencimento — diferente do relatório abaixo,
          que só soma o que já foi pago/recebido.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3 max-w-md">
          <div>
            <Label>Vencimento de</Label>
            <Input type="date" value={contasInicio} onChange={(e) => setContasInicio(e.target.value)} />
          </div>
          <div>
            <Label>Até</Label>
            <Input type="date" value={contasFim} onChange={(e) => setContasFim(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-700">A receber (pacientes)</h3>
              <span className="text-sm font-bold text-emerald-700">{moeda(contas?.totalAReceber ?? 0)}</span>
            </div>
            {contas && contas.aReceber.length > 0 ? (
              <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {contas.aReceber.map((l, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">{l.paciente_nome}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {l.descricao} · vence {l.data_vencimento ? new Date(`${l.data_vencimento}T00:00:00`).toLocaleDateString('pt-BR') : '—'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-slate-800">{moeda(l.valor)}</p>
                      <Badge tone={l.status === 'atrasado' ? 'red' : 'amber'}>{l.status === 'atrasado' ? 'Atrasado' : 'Pendente'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Nada em aberto no período.</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-700">A pagar (despesas)</h3>
              <span className="text-sm font-bold text-red-700">{moeda(contas?.totalAPagar ?? 0)}</span>
            </div>
            {contas && contas.aPagar.length > 0 ? (
              <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {contas.aPagar.map((d, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">{d.descricao}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {d.categoria || 'Sem categoria'} · vence {new Date(`${d.data}T00:00:00`).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className="font-semibold text-slate-800 shrink-0">{moeda(d.valor)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Nada em aberto no período.</p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <Wallet className="h-4 w-4" strokeWidth={2} />
            </span>
            <h2 className="font-semibold text-slate-800">Recebíveis e despesas</h2>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              relatoriosApi
                .abrirFinanceiroPdf(periodo, { data_inicio: financeiroInicio || undefined, data_fim: financeiroFim || undefined })
                .catch(() => alert('Erro ao gerar o PDF.'))
            }
          >
            <FileDown className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 max-w-2xl">
          <div>
            <Label>Agrupar</Label>
            <Select value={periodo} onChange={(e) => setPeriodo(e.target.value as PeriodoFinanceiro)}>
              {(Object.keys(ROTULOS_PERIODO) as PeriodoFinanceiro[]).map((p) => (
                <option key={p} value={p}>
                  {ROTULOS_PERIODO[p]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>De</Label>
            <Input type="date" value={financeiroInicio} onChange={(e) => setFinanceiroInicio(e.target.value)} />
          </div>
          <div>
            <Label>Até</Label>
            <Input type="date" value={financeiroFim} onChange={(e) => setFinanceiroFim(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-700">Recebíveis</h3>
              <span className="text-sm font-bold text-emerald-700">{moeda(totalRecebiveis)}</span>
            </div>
            {financeiro && financeiro.recebiveis.length > 0 ? (
              <div className="border border-slate-100 rounded-lg divide-y divide-slate-100">
                {financeiro.recebiveis.map((r) => (
                  <div key={r.chave} className="flex items-center justify-between px-3 py-1.5 text-sm">
                    <span className="text-slate-600">{r.chave}</span>
                    <span className="font-medium text-slate-800">{moeda(r.valor)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Nenhum recebimento no período.</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-700">Despesas</h3>
              <span className="text-sm font-bold text-red-700">{moeda(totalDespesas)}</span>
            </div>
            {financeiro && financeiro.despesas.length > 0 ? (
              <div className="border border-slate-100 rounded-lg divide-y divide-slate-100">
                {financeiro.despesas.map((d) => (
                  <div key={d.chave} className="flex items-center justify-between px-3 py-1.5 text-sm">
                    <span className="text-slate-600">{d.chave}</span>
                    <span className="font-medium text-slate-800">{moeda(d.valor)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Nenhuma despesa no período.</p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <Stethoscope className="h-4 w-4" strokeWidth={2} />
            </span>
            <h2 className="font-semibold text-slate-800">Perfil epidemiológico</h2>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              relatoriosApi.abrirEpidemiologicoPdf({ data_inicio: epiInicio || undefined, data_fim: epiFim || undefined }).catch(() => alert('Erro ao gerar o PDF.'))
            }
          >
            <FileDown className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Sexo, faixa etária e procedimentos/consultas dos atendimentos concluídos no período — cada atendimento conta uma vez.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-4 max-w-md">
          <div>
            <Label>De</Label>
            <Input type="date" value={epiInicio} onChange={(e) => setEpiInicio(e.target.value)} />
          </div>
          <div>
            <Label>Até</Label>
            <Input type="date" value={epiFim} onChange={(e) => setEpiFim(e.target.value)} />
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          Total de atendimentos concluídos: <span className="font-bold text-slate-900">{epi?.total ?? 0}</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { titulo: 'Por sexo', linhas: epi?.porSexo ?? [] },
            { titulo: 'Por faixa etária', linhas: epi?.porFaixaEtaria ?? [] },
            { titulo: 'Procedimentos/consultas', linhas: epi?.porProcedimento ?? [] },
          ].map((bloco) => (
            <div key={bloco.titulo}>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">{bloco.titulo}</h3>
              {bloco.linhas.length > 0 ? (
                <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {bloco.linhas.map((l) => (
                    <div key={l.rotulo} className="flex items-center justify-between px-3 py-1.5 text-sm gap-2">
                      <span className="text-slate-600 truncate">{l.rotulo}</span>
                      <span className="font-medium text-slate-800 shrink-0">
                        {l.quantidade} {epi && epi.total > 0 ? `(${((l.quantidade / epi.total) * 100).toFixed(0)}%)` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Nada no período.</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <CalendarX className="h-4 w-4" strokeWidth={2} />
              </span>
              <h2 className="font-semibold text-slate-800">Absenteísmo</h2>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                relatoriosApi.abrirAbsenteismoPdf({ data_inicio: absInicio || undefined, data_fim: absFim || undefined }).catch(() => alert('Erro ao gerar o PDF.'))
              }
            >
              <FileDown className="h-3.5 w-3.5" /> PDF
            </Button>
          </div>
          <p className="text-xs text-slate-400 mb-3">Pacientes marcados como falta na Agenda, no período.</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label>De</Label>
              <Input type="date" value={absInicio} onChange={(e) => setAbsInicio(e.target.value)} />
            </div>
            <div>
              <Label>Até</Label>
              <Input type="date" value={absFim} onChange={(e) => setAbsFim(e.target.value)} />
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            <span className="font-bold text-slate-900">{absenteismo?.total ?? 0}</span> faltas
            {absenteismo && absenteismo.totalRelevante > 0 && (
              <>
                {' '}
                · taxa de <span className="font-bold text-red-700">{absenteismo.taxa.toFixed(1)}%</span> (sobre {absenteismo.totalRelevante} atendimentos)
              </>
            )}
          </p>
          <TabelaAgendamentos linhas={absenteismo?.linhas ?? []} />
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <XCircle className="h-4 w-4" strokeWidth={2} />
              </span>
              <h2 className="font-semibold text-slate-800">Cancelamento</h2>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                relatoriosApi.abrirCancelamentoPdf({ data_inicio: cancInicio || undefined, data_fim: cancFim || undefined }).catch(() => alert('Erro ao gerar o PDF.'))
              }
            >
              <FileDown className="h-3.5 w-3.5" /> PDF
            </Button>
          </div>
          <p className="text-xs text-slate-400 mb-3">Consultas/procedimentos cancelados, no período.</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label>De</Label>
              <Input type="date" value={cancInicio} onChange={(e) => setCancInicio(e.target.value)} />
            </div>
            <div>
              <Label>Até</Label>
              <Input type="date" value={cancFim} onChange={(e) => setCancFim(e.target.value)} />
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            <span className="font-bold text-slate-900">{cancelamento?.total ?? 0}</span> cancelamentos
            {cancelamento && cancelamento.totalGeral > 0 && (
              <>
                {' '}
                · taxa de <span className="font-bold text-red-700">{cancelamento.taxa.toFixed(1)}%</span> (sobre {cancelamento.totalGeral} agendamentos)
              </>
            )}
          </p>
          <TabelaAgendamentos linhas={cancelamento?.linhas ?? []} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <ClipboardList className="h-4 w-4" strokeWidth={2} />
              </span>
              <h2 className="font-semibold text-slate-800">Total de consultas e procedimentos</h2>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                relatoriosApi.abrirConsultasProcedimentosPdf({ data_inicio: cpInicio || undefined, data_fim: cpFim || undefined }).catch(() => alert('Erro ao gerar o PDF.'))
              }
            >
              <FileDown className="h-3.5 w-3.5" /> PDF
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label>De</Label>
              <Input type="date" value={cpInicio} onChange={(e) => setCpInicio(e.target.value)} />
            </div>
            <div>
              <Label>Até</Label>
              <Input type="date" value={cpFim} onChange={(e) => setCpFim(e.target.value)} />
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            Total realizado: <span className="font-bold text-slate-900">{consultasProcedimentos?.total ?? 0}</span>
          </p>
          <TabelaDistribuicao linhas={consultasProcedimentos?.porProcedimento ?? []} total={consultasProcedimentos?.total ?? 0} />
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <TrendingUp className="h-4 w-4" strokeWidth={2} />
              </span>
              <h2 className="font-semibold text-slate-800">Vendas por profissional</h2>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                relatoriosApi.abrirVendasProfissionalPdf({ data_inicio: vpInicio || undefined, data_fim: vpFim || undefined }).catch(() => alert('Erro ao gerar o PDF.'))
              }
            >
              <FileDown className="h-3.5 w-3.5" /> PDF
            </Button>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Quantidade de consultas/procedimentos concluídos por profissional (não há valor em R$ vinculado hoje).
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label>De</Label>
              <Input type="date" value={vpInicio} onChange={(e) => setVpInicio(e.target.value)} />
            </div>
            <div>
              <Label>Até</Label>
              <Input type="date" value={vpFim} onChange={(e) => setVpFim(e.target.value)} />
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            Total realizado: <span className="font-bold text-slate-900">{vendasProfissional?.total ?? 0}</span>
          </p>
          <TabelaDistribuicao linhas={vendasProfissional?.porProfissional ?? []} total={vendasProfissional?.total ?? 0} />
        </Card>
      </div>

      <Card className="p-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <Banknote className="h-4 w-4" strokeWidth={2} />
            </span>
            <h2 className="font-semibold text-slate-800">Repasse de pagamento</h2>
          </div>
          <Button variant="secondary" onClick={() => relatoriosApi.abrirRepassePdf(repasseMes, repasseAno).catch(() => alert('Erro ao gerar o PDF.'))}>
            <FileDown className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Mesmo cálculo do módulo Comissões (fixo mensal + comissão por cirurgia + avulsas aprovadas), por competência.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-4 max-w-xs">
          <div>
            <Label>Mês</Label>
            <Select value={repasseMes} onChange={(e) => setRepasseMes(Number(e.target.value))}>
              {NOMES_MES_CURTO.map((nome, i) => (
                <option key={nome} value={i + 1}>
                  {nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Ano</Label>
            <Input type="number" value={repasseAno} onChange={(e) => setRepasseAno(Number(e.target.value))} />
          </div>
        </div>

        {repasse && repasse.resumo.length > 0 ? (
          <>
            <div className="border border-slate-100 rounded-lg divide-y divide-slate-100">
              {repasse.resumo.map((r) => (
                <div key={r.usuario_id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{r.usuario_nome}</p>
                    <p className="text-xs text-slate-400 truncate">
                      Fixo {moeda(r.valor_fixo_mensal)} · Procedimentos {moeda(r.total_procedimentos)} · Avulsas {moeda(r.total_avulsas_aprovadas)}
                    </p>
                  </div>
                  <span className="font-semibold text-slate-800 shrink-0">{moeda(r.total)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-2">
              <span className="text-sm font-bold text-emerald-700">Total geral: {moeda(repasse.totalGeral)}</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">Nenhum profissional com repasse nesta competência.</p>
        )}
      </Card>
    </div>
  )
}
