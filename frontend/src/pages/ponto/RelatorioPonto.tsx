import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { Badge, Card, EmptyState, PageHeader, Select } from '../../components/ui'
import { pontosApi } from '../../api/pontos'
import type { ResumoPonto } from '../../types'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatarHoras(h: number) {
  const sinal = h < 0 ? '-' : ''
  const abs = Math.abs(h)
  const horas = Math.floor(abs)
  const minutos = Math.round((abs - horas) * 60)
  return `${sinal}${horas}h${String(minutos).padStart(2, '0')}`
}

export default function RelatorioPonto() {
  const agora = new Date()
  const [mes, setMes] = useState(agora.getMonth() + 1)
  const [ano, setAno] = useState(agora.getFullYear())
  const [dados, setDados] = useState<ResumoPonto | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    setCarregando(true)
    pontosApi
      .resumo(mes, ano)
      .then(setDados)
      .finally(() => setCarregando(false))
  }, [mes, ano])

  return (
    <div>
      <PageHeader title="Relatório de ponto" subtitle="Horas trabalhadas e saldo (banco de horas) por funcionário" icon={BarChart3} />

      <div className="flex gap-2 mb-4 max-w-xs">
        <Select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
          {MESES.map((nome, i) => (
            <option key={nome} value={i + 1}>
              {nome}
            </option>
          ))}
        </Select>
        <Select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
          {[agora.getFullYear() - 1, agora.getFullYear(), agora.getFullYear() + 1].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
      </div>

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : !dados || dados.resumo.length === 0 ? (
        <EmptyState text="Nenhum funcionário com registro de ponto neste período." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Funcionário</th>
                  <th className="px-4 py-2.5 font-medium">Meta do mês</th>
                  <th className="px-4 py-2.5 font-medium">Horas trabalhadas</th>
                  <th className="px-4 py-2.5 font-medium">Saldo</th>
                  <th className="px-4 py-2.5 font-medium">Marcações</th>
                </tr>
              </thead>
              <tbody>
                {dados.resumo.map((r) => (
                  <tr key={r.usuario_id} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{r.usuario_nome}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatarHoras(r.meta_horas)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatarHoras(r.horas_trabalhadas)}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={r.saldo_horas < 0 ? 'red' : r.saldo_horas > 0 ? 'green' : 'slate'}>
                        {r.saldo_horas > 0 ? '+' : ''}
                        {formatarHoras(r.saldo_horas)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{r.total_registros}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
