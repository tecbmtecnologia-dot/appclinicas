import { useEffect, useMemo, useState } from 'react'
import { BarChart3, FileDown, Scissors, Users, Wallet } from 'lucide-react'
import { Button, Card, Input, Label, PageHeader, Select } from '../../components/ui'
import { relatoriosApi, type PeriodoFinanceiro, type RelatorioCirurgias, type RelatorioFinanceiro, type RelatorioPacientes } from '../../api/relatorios'

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const ROTULOS_PERIODO: Record<PeriodoFinanceiro, string> = {
  dia: 'Por dia',
  semana: 'Por semana',
  mes: 'Por mês',
  ano: 'Por ano',
}

export default function Relatorios() {
  const [pacientes, setPacientes] = useState<RelatorioPacientes | null>(null)

  const [cirurgiasInicio, setCirurgiasInicio] = useState('')
  const [cirurgiasFim, setCirurgiasFim] = useState('')
  const [cirurgias, setCirurgias] = useState<RelatorioCirurgias | null>(null)

  const [periodo, setPeriodo] = useState<PeriodoFinanceiro>('mes')
  const [financeiroInicio, setFinanceiroInicio] = useState('')
  const [financeiroFim, setFinanceiroFim] = useState('')
  const [financeiro, setFinanceiro] = useState<RelatorioFinanceiro | null>(null)

  useEffect(() => {
    relatoriosApi.pacientes().then(setPacientes).catch(() => {})
  }, [])

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

  const totalRecebiveis = useMemo(() => financeiro?.recebiveis.reduce((s, r) => s + r.valor, 0) ?? 0, [financeiro])
  const totalDespesas = useMemo(() => financeiro?.despesas.reduce((s, r) => s + r.valor, 0) ?? 0, [financeiro])

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Visão geral da clínica — só admin" icon={BarChart3} />

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
    </div>
  )
}
