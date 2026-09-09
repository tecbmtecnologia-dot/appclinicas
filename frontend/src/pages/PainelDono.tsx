import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, PieChart, PiggyBank, Scale, Scissors, Users } from 'lucide-react'
import { Card, PageHeader, Select } from '../components/ui'
import { dashboardApi } from '../api/dashboard'
import { financasPessoaisApi } from '../api/financasPessoais'
import type { ResumoDashboard, ResumoFinancasPessoais } from '../types'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function StatGroup({ titulo, icon: Icon, itens }: { titulo: string; icon: typeof Scissors; itens: { label: string; valor: number }[] }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <h2 className="font-semibold text-slate-800">{titulo}</h2>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {itens.map((it) => (
          <div key={it.label}>
            <p className="text-2xl font-bold text-slate-900">{it.valor}</p>
            <p className="text-xs text-slate-400 mt-0.5">{it.label}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

function GraficoFinanceiro({ recebido, gasto }: { recebido: number; gasto: number }) {
  const total = recebido + gasto
  const pctRecebido = total > 0 ? (recebido / total) * 100 : 0
  const saldo = recebido - gasto

  if (total === 0) {
    return <p className="text-sm text-slate-400">Sem lançamentos financeiros pagos neste período.</p>
  }

  return (
    <div className="flex flex-wrap items-center gap-8">
      <div
        className="relative h-40 w-40 shrink-0 rounded-full ring-1 ring-slate-200"
        style={{
          background: `conic-gradient(#059669 0% ${pctRecebido}%, #dc2626 ${pctRecebido}% 100%)`,
        }}
      >
        <div className="absolute inset-3 rounded-full bg-white flex flex-col items-center justify-center">
          <p className="text-xs text-slate-400">Saldo</p>
          <p className={`text-lg font-bold ${saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{moeda(saldo)}</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-800">Recebido</p>
            <p className="text-xs text-slate-500">
              {moeda(recebido)} ({Math.round(pctRecebido)}%)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-800">Gasto</p>
            <p className="text-xs text-slate-500">
              {moeda(gasto)} ({Math.round(100 - pctRecebido)}%)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PainelDono() {
  const agora = new Date()
  const [mes, setMes] = useState(agora.getMonth() + 1)
  const [ano, setAno] = useState(agora.getFullYear())
  const [dados, setDados] = useState<ResumoDashboard | null>(null)
  const [pessoal, setPessoal] = useState<ResumoFinancasPessoais | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setCarregando(true)
    setErro(null)
    Promise.all([dashboardApi.resumo(mes, ano), financasPessoaisApi.resumo(mes, ano)])
      .then(([d, p]) => {
        setDados(d)
        setPessoal(p)
      })
      .catch(() => setErro('Não foi possível carregar o painel. Verifique se o backend está rodando.'))
      .finally(() => setCarregando(false))
  }, [mes, ano])

  return (
    <div>
      <PageHeader title="Painel da clínica" subtitle="Visão geral de cirurgias, consultas e financeiro" icon={PieChart} />

      {erro && <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">{erro}</div>}

      {carregando || !dados ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatGroup
              titulo="Cirurgias realizadas"
              icon={Scissors}
              itens={[
                { label: 'Esta semana', valor: dados.cirurgias.semana },
                { label: 'Este mês', valor: dados.cirurgias.mes },
                { label: 'Este ano', valor: dados.cirurgias.ano },
              ]}
            />
            <StatGroup
              titulo="Consultas agendadas"
              icon={CalendarDays}
              itens={[
                { label: 'Esta semana', valor: dados.consultas.semana },
                { label: 'Este mês', valor: dados.consultas.mes },
                { label: 'Este ano', valor: dados.consultas.ano },
              ]}
            />
          </div>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Users className="h-4 w-4" strokeWidth={2} />
              </span>
              <h2 className="font-semibold text-slate-800">Pacientes cadastrados</h2>
            </div>
            <p className="text-2xl font-bold text-slate-900">{dados.pacientes_total}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {dados.consultas.concluidas_mes} consulta(s) concluída(s) este mês
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <PieChart className="h-4 w-4" strokeWidth={2} />
                </span>
                <h2 className="font-semibold text-slate-800">Financeiro — recebido x gasto</h2>
              </div>
              <div className="flex gap-2">
                <Select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="!w-auto">
                  {MESES.map((nome, i) => (
                    <option key={nome} value={i + 1}>
                      {nome}
                    </option>
                  ))}
                </Select>
                <Select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="!w-auto">
                  {[agora.getFullYear() - 1, agora.getFullYear(), agora.getFullYear() + 1].map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <GraficoFinanceiro recebido={dados.financeiro.recebido} gasto={dados.financeiro.gasto} />
          </Card>

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <PiggyBank className="h-4 w-4" strokeWidth={2} />
                </span>
                <div>
                  <h2 className="font-semibold text-slate-800">Minhas finanças pessoais</h2>
                  <p className="text-xs text-slate-400">Privado — só você vê, separado do financeiro da clínica</p>
                </div>
              </div>
              <Link to="/financeiro/minhas-financas" className="text-sm font-medium text-brand-700 hover:text-brand-800 whitespace-nowrap">
                Gerenciar lançamentos →
              </Link>
            </div>
            {pessoal && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Receitas do mês</p>
                  <p className="text-xl font-bold text-emerald-600">{moeda(pessoal.receitas)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Despesas do mês</p>
                  <p className="text-xl font-bold text-red-600">{moeda(pessoal.despesas)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Saldo do mês</p>
                  <p className={`text-xl font-bold ${pessoal.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {moeda(pessoal.saldo)}
                  </p>
                </div>
              </div>
            )}
          </Card>

          {pessoal && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Scale className="h-4 w-4" strokeWidth={2} />
                </span>
                <h2 className="font-semibold text-slate-800">Balanço geral (clínica + pessoal)</h2>
              </div>
              <p className="text-xs text-slate-400 mb-4 ml-10">Soma tudo que entrou e tudo que saiu no período, juntando os dois lados.</p>
              <GraficoFinanceiro recebido={dados.financeiro.recebido + pessoal.receitas} gasto={dados.financeiro.gasto + pessoal.despesas} />
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                <p>
                  Recebido: {moeda(dados.financeiro.recebido)} (clínica) + {moeda(pessoal.receitas)} (pessoal)
                </p>
                <p>
                  Gasto: {moeda(dados.financeiro.gasto)} (clínica) + {moeda(pessoal.despesas)} (pessoal)
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
