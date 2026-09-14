import { useEffect, useState } from 'react'
import { BarChart3, UserCircle2 } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Select } from '../../components/ui'
import { pontosApi } from '../../api/pontos'
import { usuariosApi, type Colega } from '../../api/usuarios'
import { ApiError } from '../../api/client'
import type { Ponto, ResumoPonto, ResumoPontoUsuario, TipoPonto } from '../../types'

const ROTULOS_TIPO_PONTO: Record<Ponto['tipo'], string> = {
  entrada: 'Entrada',
  inicio_intervalo: 'Início do intervalo',
  fim_intervalo: 'Fim do intervalo',
  saida: 'Saída',
}

function horario(dataHora: string) {
  return new Date(dataHora.replace(' ', 'T')).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatarData(dataISO: string) {
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

function formatarHoras(h: number) {
  const sinal = h < 0 ? '-' : ''
  const abs = Math.abs(h)
  const horas = Math.floor(abs)
  const minutos = Math.round((abs - horas) * 60)
  return `${sinal}${horas}h${String(minutos).padStart(2, '0')}`
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

function horaAgora() {
  return new Date().toTimeString().slice(0, 5)
}

const vazioManual = { usuario_id: '', tipo: 'entrada' as TipoPonto, data: hoje(), hora: horaAgora() }

export default function RelatorioPonto() {
  const agora = new Date()
  const [mes, setMes] = useState(agora.getMonth() + 1)
  const [ano, setAno] = useState(agora.getFullYear())
  const [dados, setDados] = useState<ResumoPonto | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [verFotosDe, setVerFotosDe] = useState<ResumoPontoUsuario | null>(null)
  const [registros, setRegistros] = useState<Ponto[]>([])
  const [carregandoRegistros, setCarregandoRegistros] = useState(false)
  const [colegas, setColegas] = useState<Colega[]>([])
  const [modalManualAberto, setModalManualAberto] = useState(false)
  const [formManual, setFormManual] = useState(vazioManual)
  const [salvandoManual, setSalvandoManual] = useState(false)
  const [erroManual, setErroManual] = useState<string | null>(null)
  const [editando, setEditando] = useState<Ponto | null>(null)
  const [formEdicao, setFormEdicao] = useState({ data: '', hora: '', tipo: 'entrada' as TipoPonto })
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [erroEdicao, setErroEdicao] = useState<string | null>(null)

  function carregarResumo() {
    setCarregando(true)
    pontosApi
      .resumo(mes, ano)
      .then(setDados)
      .finally(() => setCarregando(false))
  }

  useEffect(carregarResumo, [mes, ano])
  useEffect(() => {
    usuariosApi.colegas().then(setColegas).catch(() => {})
  }, [])

  function abrirLancamentoManual() {
    setFormManual(vazioManual)
    setErroManual(null)
    setModalManualAberto(true)
  }

  async function salvarManual() {
    setSalvandoManual(true)
    setErroManual(null)
    try {
      await pontosApi.lancarManual(formManual)
      setModalManualAberto(false)
      carregarResumo()
      if (verFotosDe?.usuario_id === formManual.usuario_id) abrirFotos(verFotosDe)
    } catch (err) {
      setErroManual(err instanceof ApiError ? err.message : 'Erro ao lançar o ponto manual.')
    } finally {
      setSalvandoManual(false)
    }
  }

  function abrirEdicao(p: Ponto) {
    const [data, horaCompleta] = p.data_hora.split(' ')
    setEditando(p)
    setFormEdicao({ data, hora: (horaCompleta ?? '00:00:00').slice(0, 5), tipo: p.tipo })
    setErroEdicao(null)
  }

  async function salvarEdicao() {
    if (!editando) return
    setSalvandoEdicao(true)
    setErroEdicao(null)
    try {
      await pontosApi.atualizar(editando.id, formEdicao)
      setEditando(null)
      if (verFotosDe) abrirFotos(verFotosDe)
      carregarResumo()
    } catch (err) {
      setErroEdicao(err instanceof ApiError ? err.message : 'Erro ao salvar a alteração.')
    } finally {
      setSalvandoEdicao(false)
    }
  }

  function abrirFotos(r: ResumoPontoUsuario) {
    setVerFotosDe(r)
    setCarregandoRegistros(true)
    const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`
    const fim = `${ano}-${String(mes).padStart(2, '0')}-31`
    pontosApi
      .listar({ usuario_id: r.usuario_id, data_inicio: inicio, data_fim: fim })
      .then(setRegistros)
      .finally(() => setCarregandoRegistros(false))
  }

  return (
    <div>
      <PageHeader
        title="Relatório de ponto"
        subtitle="Horas trabalhadas e saldo (banco de horas) por funcionário"
        icon={BarChart3}
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => pontosApi.abrirFolhaFrequenciaPdf(mes, ano).catch(() => alert('Erro ao gerar a folha de frequência.'))}
            >
              Folha de frequência (PDF)
            </Button>
            <Button onClick={abrirLancamentoManual}>+ Lançar ponto manual</Button>
          </div>
        }
      />

      <p className="text-xs text-slate-400 -mt-4 mb-4">
        A folha de frequência usa o período de apuração do dia 21 do mês anterior ao dia 20 do mês selecionado abaixo.
      </p>

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
                  <th className="px-4 py-2.5 font-medium">Jornada</th>
                  <th className="px-4 py-2.5 font-medium">Meta do período</th>
                  <th className="px-4 py-2.5 font-medium">Horas trabalhadas</th>
                  <th className="px-4 py-2.5 font-medium">Saldo do período</th>
                  <th className="px-4 py-2.5 font-medium">Saldo acumulado</th>
                  <th className="px-4 py-2.5 font-medium">Esta semana</th>
                  <th className="px-4 py-2.5 font-medium">Marcações</th>
                </tr>
              </thead>
              <tbody>
                {dados.resumo.map((r) => (
                  <tr key={r.usuario_id} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      <button onClick={() => abrirFotos(r)} className="flex items-center gap-2 hover:underline">
                        {r.foto_url ? (
                          <img src={r.foto_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                            <UserCircle2 className="h-4 w-4 text-slate-300" />
                          </div>
                        )}
                        {r.usuario_nome}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">
                      {r.jornada?.variavel ? (
                        <>
                          Jornada variável ({r.jornada.dias_semana?.length ?? 0} dias)
                          <br />
                          {formatarHoras(r.jornada.horas_semana ?? 0)}/semana
                        </>
                      ) : r.jornada ? (
                        <>
                          {r.jornada.entrada}–{r.jornada.saida}
                          {r.jornada.inicio_intervalo && r.jornada.fim_intervalo ? ` (int. ${r.jornada.inicio_intervalo}–${r.jornada.fim_intervalo})` : ''}
                          <br />
                          {formatarHoras(r.jornada.horas_dia ?? 0)}/dia
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{formatarHoras(r.meta_horas)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatarHoras(r.horas_trabalhadas)}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={r.saldo_horas < 0 ? 'red' : r.saldo_horas > 0 ? 'green' : 'slate'}>
                        {r.saldo_horas > 0 ? '+' : ''}
                        {formatarHoras(r.saldo_horas)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      {r.saldo_acumulado ? (
                        <>
                          <Badge tone={r.saldo_acumulado.saldo < 0 ? 'red' : r.saldo_acumulado.saldo > 0 ? 'green' : 'slate'}>
                            {r.saldo_acumulado.saldo > 0 ? '+' : ''}
                            {formatarHoras(r.saldo_acumulado.saldo)}
                          </Badge>
                          <p className="text-[11px] text-slate-400 mt-1">
                            desde {formatarData(r.saldo_acumulado.desde)} ({r.saldo_acumulado.periodos}{' '}
                            {r.saldo_acumulado.periodos === 1 ? 'mês' : 'meses'})
                          </p>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {formatarHoras(r.semana_atual.horas_trabalhadas)}
                      {r.semana_atual.horas_esperadas != null && (
                        <>
                          {' '}
                          <span className="text-xs text-slate-400">/ {formatarHoras(r.semana_atual.horas_esperadas)}</span>
                          <Badge tone={r.semana_atual.saldo != null && r.semana_atual.saldo < 0 ? 'red' : 'green'}>
                            {r.semana_atual.saldo != null && r.semana_atual.saldo > 0 ? '+' : ''}
                            {r.semana_atual.saldo != null ? formatarHoras(r.semana_atual.saldo) : '—'}
                          </Badge>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{r.total_registros}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={!!verFotosDe}
        onClose={() => setVerFotosDe(null)}
        title={verFotosDe ? `Fotos do ponto — ${verFotosDe.usuario_nome}` : ''}
      >
        <div className="space-y-4">
          {verFotosDe && (
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              {verFotosDe.foto_url ? (
                <img src={verFotosDe.foto_url} alt="" className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-slate-100 flex items-center justify-center">
                  <UserCircle2 className="h-8 w-8 text-slate-300" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-800">Foto de referência</p>
                <p className="text-xs text-slate-400">Compare com as selfies do ponto abaixo</p>
              </div>
            </div>
          )}

          {carregandoRegistros ? (
            <p className="text-sm text-slate-400">Carregando...</p>
          ) : registros.length === 0 ? (
            <EmptyState text="Nenhuma marcação de ponto neste mês." />
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {registros.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {p.foto_url ? (
                      <img src={p.foto_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <UserCircle2 className="h-5 w-5 text-slate-300" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700">{ROTULOS_TIPO_PONTO[p.tipo]}</p>
                      <p className="text-xs text-slate-400">
                        {horario(p.data_hora)}
                        {p.editado_em && <span className="text-amber-600"> · editado</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone={p.dentro_raio ? 'green' : 'amber'}>{p.dentro_raio ? 'No local' : 'Fora do raio'}</Badge>
                    <button onClick={() => abrirEdicao(p)} className="text-xs font-medium text-brand-700 hover:underline">
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal open={modalManualAberto} onClose={() => setModalManualAberto(false)} title="Lançar ponto manual">
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Use pra corrigir esquecimentos ou lançar marcações de quem não usa o app. Não pede foto nem localização.
          </p>
          <div>
            <Label>Funcionário</Label>
            <Select value={formManual.usuario_id} onChange={(e) => setFormManual({ ...formManual, usuario_id: e.target.value })}>
              <option value="">Selecione...</option>
              {colegas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={formManual.tipo} onChange={(e) => setFormManual({ ...formManual, tipo: e.target.value as TipoPonto })}>
              <option value="entrada">Entrada</option>
              <option value="inicio_intervalo">Início do intervalo</option>
              <option value="fim_intervalo">Fim do intervalo</option>
              <option value="saida">Saída</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={formManual.data} onChange={(e) => setFormManual({ ...formManual, data: e.target.value })} />
            </div>
            <div>
              <Label>Hora</Label>
              <Input type="time" value={formManual.hora} onChange={(e) => setFormManual({ ...formManual, hora: e.target.value })} />
            </div>
          </div>
          {erroManual && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroManual}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalManualAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarManual} disabled={salvandoManual || !formManual.usuario_id || !formManual.data || !formManual.hora}>
              {salvandoManual ? 'Salvando...' : 'Lançar'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar marcação de ponto">
        <div className="space-y-3">
          <p className="text-xs text-slate-400">Corrige o dia/horário ou o tipo dessa marcação. A foto e a localização originais são mantidas.</p>
          <div>
            <Label>Tipo</Label>
            <Select value={formEdicao.tipo} onChange={(e) => setFormEdicao({ ...formEdicao, tipo: e.target.value as TipoPonto })}>
              <option value="entrada">Entrada</option>
              <option value="inicio_intervalo">Início do intervalo</option>
              <option value="fim_intervalo">Fim do intervalo</option>
              <option value="saida">Saída</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={formEdicao.data} onChange={(e) => setFormEdicao({ ...formEdicao, data: e.target.value })} />
            </div>
            <div>
              <Label>Hora</Label>
              <Input type="time" value={formEdicao.hora} onChange={(e) => setFormEdicao({ ...formEdicao, hora: e.target.value })} />
            </div>
          </div>
          {erroEdicao && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroEdicao}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button onClick={salvarEdicao} disabled={salvandoEdicao || !formEdicao.data || !formEdicao.hora}>
              {salvandoEdicao ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
