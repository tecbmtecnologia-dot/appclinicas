import { useEffect, useState } from 'react'
import { HandCoins } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Label, PageHeader, Select } from '../../components/ui'
import { comissoesApi } from '../../api/comissoes'
import { cirurgiasApi } from '../../api/cirurgias'
import { useAuth } from '../../contexts/AuthContext'
import { ApiError } from '../../api/client'
import type { Cirurgia, ComissaoAvulsa, MinhaComissao, ResumoComissoes, Usuario } from '../../types'

function statusAvulsaTone(status: ComissaoAvulsa['status']) {
  return status === 'aprovada' ? 'green' : status === 'recusada' ? 'red' : 'amber'
}

const vazioAvulsa = {
  data: new Date().toISOString().slice(0, 10),
  paciente_nome: '',
  nome_cirurgia: '',
  descricao: '',
  valor: 0,
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(v?: string | null) {
  if (!v) return '—'
  const d = new Date(v.includes('T') || v.includes(' ') ? v.replace(' ', 'T') : `${v}T00:00:00`)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleDateString('pt-BR')
}

const rotulosRole: Record<string, string> = {
  admin: 'Administrador',
  coordenador: 'Coordenador(a)',
  medico: 'Médico(a)',
  enfermagem: 'Enfermagem',
  recepcao: 'Recepção',
  financeiro: 'Financeiro',
  pj: 'PJ (comissionado)',
}

function SeletorMesAno({
  mes,
  ano,
  onMes,
  onAno,
}: {
  mes: number
  ano: number
  onMes: (m: number) => void
  onAno: (a: number) => void
}) {
  const agora = new Date()
  return (
    <div className="flex gap-2 mb-4 max-w-xs">
      <Select value={mes} onChange={(e) => onMes(Number(e.target.value))}>
        {MESES.map((nome, i) => (
          <option key={nome} value={i + 1}>
            {nome}
          </option>
        ))}
      </Select>
      <Select value={ano} onChange={(e) => onAno(Number(e.target.value))}>
        {[agora.getFullYear() - 1, agora.getFullYear(), agora.getFullYear() + 1].map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </Select>
    </div>
  )
}

export default function Comissoes() {
  const { usuario } = useAuth()
  const podeGerenciar = usuario?.role === 'admin' || usuario?.role === 'financeiro'
  return (
    <div>
      <PageHeader
        title="Comissões"
        subtitle={podeGerenciar ? 'Valor fixo mensal + valor combinado por procedimento cirúrgico' : 'Sua comissão do mês'}
        icon={HandCoins}
      />
      {podeGerenciar ? <ComissoesGestao /> : <MinhaComissaoView />}
    </div>
  )
}

function MinhaComissaoView() {
  const agora = new Date()
  const [mes, setMes] = useState(agora.getMonth() + 1)
  const [ano, setAno] = useState(agora.getFullYear())
  const [dados, setDados] = useState<MinhaComissao | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [formAvulsa, setFormAvulsa] = useState(vazioAvulsa)
  const [editandoAvulsa, setEditandoAvulsa] = useState<ComissaoAvulsa | null>(null)
  const [salvandoAvulsa, setSalvandoAvulsa] = useState(false)
  const [erroAvulsa, setErroAvulsa] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    comissoesApi
      .minhas(mes, ano)
      .then(setDados)
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [mes, ano])

  function abrirEdicaoAvulsa(a: ComissaoAvulsa) {
    setEditandoAvulsa(a)
    setFormAvulsa({
      data: a.data,
      paciente_nome: a.paciente_nome,
      nome_cirurgia: a.nome_cirurgia,
      descricao: a.descricao ?? '',
      valor: a.valor,
    })
    setErroAvulsa(null)
  }

  function cancelarEdicaoAvulsa() {
    setEditandoAvulsa(null)
    setFormAvulsa(vazioAvulsa)
    setErroAvulsa(null)
  }

  async function salvarAvulsa() {
    setSalvandoAvulsa(true)
    setErroAvulsa(null)
    try {
      if (editandoAvulsa) {
        await comissoesApi.avulsas.atualizar(editandoAvulsa.id, formAvulsa)
      } else {
        await comissoesApi.avulsas.criar(formAvulsa)
      }
      cancelarEdicaoAvulsa()
      carregar()
    } catch (err) {
      setErroAvulsa(err instanceof ApiError ? err.message : 'Erro ao salvar lançamento.')
    } finally {
      setSalvandoAvulsa(false)
    }
  }

  async function removerAvulsa(a: ComissaoAvulsa) {
    if (!confirm(`Remover o lançamento de "${a.paciente_nome}"?`)) return
    await comissoesApi.avulsas.remover(a.id)
    carregar()
  }

  return (
    <div>
      <SeletorMesAno mes={mes} ano={ano} onMes={setMes} onAno={setAno} />
      {carregando || !dados ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Card className="p-4">
              <p className="text-xs text-slate-400 mb-1">Valor fixo mensal</p>
              <p className="text-xl font-bold text-slate-800">{moeda(dados.valor_fixo_mensal)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-400 mb-1">Procedimentos do mês</p>
              <p className="text-xl font-bold text-slate-800">{moeda(dados.total_procedimentos)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-400 mb-1">Avulsas aprovadas</p>
              <p className="text-xl font-bold text-slate-800">{moeda(dados.total_avulsas_aprovadas)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-400 mb-1">Total do mês</p>
              <p className="text-xl font-bold text-emerald-600">{moeda(dados.total)}</p>
            </Card>
          </div>

          {dados.procedimentos.length === 0 ? (
            <EmptyState text="Nenhum procedimento com comissão vinculado neste mês." />
          ) : (
            <Card className="overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-left">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Cirurgia</th>
                      <th className="px-4 py-2.5 font-medium">Data prevista</th>
                      <th className="px-4 py-2.5 font-medium">Valor combinado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.procedimentos.map((p) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="px-4 py-2.5 font-medium text-slate-800">{p.nome_cirurgia}</td>
                        <td className="px-4 py-2.5 text-slate-600">{formatarData(p.data_prevista)}</td>
                        <td className="px-4 py-2.5 text-slate-600">{moeda(p.valor_comissao)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <h2 className="font-semibold text-slate-800 mb-2">Comissões avulsas (paciente não cadastrado)</h2>
          <p className="text-xs text-slate-400 mb-3">
            Use pra paciente de convênio ou qualquer atendimento que não tenha cadastro no sistema. Fica pendente até
            admin/financeiro aprovar.
          </p>

          <Card className="p-4 mb-4 space-y-3 max-w-2xl">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Paciente</Label>
                <Input
                  placeholder="Nome do paciente (convênio)"
                  value={formAvulsa.paciente_nome}
                  onChange={(e) => setFormAvulsa({ ...formAvulsa, paciente_nome: e.target.value })}
                />
              </div>
              <div>
                <Label>Nome da cirurgia</Label>
                <Input
                  placeholder="Ex: Rinoplastia"
                  value={formAvulsa.nome_cirurgia}
                  onChange={(e) => setFormAvulsa({ ...formAvulsa, nome_cirurgia: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <Input type="date" value={formAvulsa.data} onChange={(e) => setFormAvulsa({ ...formAvulsa, data: e.target.value })} />
              </div>
              <div>
                <Label>Valor</Label>
                <Input
                  type="number"
                  value={formAvulsa.valor || ''}
                  onChange={(e) => setFormAvulsa({ ...formAvulsa, valor: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Observações (opcional — convênio, detalhes)</Label>
              <Input
                placeholder="Ex: Convênio Unimed"
                value={formAvulsa.descricao}
                onChange={(e) => setFormAvulsa({ ...formAvulsa, descricao: e.target.value })}
              />
            </div>
            {erroAvulsa && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroAvulsa}</p>}
            <div className="flex justify-end gap-2">
              {editandoAvulsa && (
                <Button variant="secondary" onClick={cancelarEdicaoAvulsa}>
                  Cancelar edição
                </Button>
              )}
              <Button
                onClick={salvarAvulsa}
                disabled={
                  salvandoAvulsa || !formAvulsa.data || !formAvulsa.paciente_nome || !formAvulsa.nome_cirurgia || !formAvulsa.valor
                }
              >
                {salvandoAvulsa ? 'Salvando...' : editandoAvulsa ? 'Salvar alterações' : '+ Lançar comissão avulsa'}
              </Button>
            </div>
          </Card>

          {dados.avulsas.length === 0 ? (
            <EmptyState text="Nenhuma comissão avulsa lançada neste mês." />
          ) : (
            <div className="space-y-2">
              {dados.avulsas.map((a) => (
                <Card key={a.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {a.paciente_nome} — {a.nome_cirurgia}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatarData(a.data)}
                      {a.descricao ? ` · ${a.descricao}` : ''}
                      {a.status === 'recusada' && a.observacao_aprovacao ? ` · Motivo: ${a.observacao_aprovacao}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-sm font-semibold text-slate-800">{moeda(a.valor)}</p>
                    <Badge tone={statusAvulsaTone(a.status)}>{a.status}</Badge>
                    {a.status === 'pendente' && (
                      <>
                        <Button variant="ghost" onClick={() => abrirEdicaoAvulsa(a)}>
                          Editar
                        </Button>
                        <Button variant="danger" onClick={() => removerAvulsa(a)}>
                          Remover
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ComissoesGestao() {
  const agora = new Date()
  const [mes, setMes] = useState(agora.getMonth() + 1)
  const [ano, setAno] = useState(agora.getFullYear())
  const [resumo, setResumo] = useState<ResumoComissoes | null>(null)
  const [usuarios, setUsuarios] = useState<Pick<Usuario, 'id' | 'nome' | 'role'>[]>([])
  const [cirurgias, setCirurgias] = useState<Cirurgia[]>([])
  const [carregando, setCarregando] = useState(true)
  const [fixos, setFixos] = useState<Record<string, string>>({})
  const [salvandoFixo, setSalvandoFixo] = useState<string | null>(null)
  const [lancando, setLancando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const [formParticipante, setFormParticipante] = useState({ cirurgia_id: '', usuario_id: '', valor_comissao: 0 })
  const [salvandoParticipante, setSalvandoParticipante] = useState(false)
  const [erroParticipante, setErroParticipante] = useState<string | null>(null)
  const [pendentes, setPendentes] = useState<ComissaoAvulsa[]>([])
  const [processandoAvulsa, setProcessandoAvulsa] = useState<string | null>(null)

  function carregarPendentes() {
    comissoesApi.avulsas.listar({ status: 'pendente' }).then(setPendentes)
  }

  function carregar() {
    setCarregando(true)
    setErro(null)
    Promise.all([comissoesApi.resumo(mes, ano), comissoesApi.usuarios(), cirurgiasApi.listar()])
      .then(([r, u, c]) => {
        setResumo(r)
        setUsuarios(u)
        setCirurgias(c)
        const mapa: Record<string, string> = {}
        for (const u2 of u) {
          const doResumo = r.resumo.find((x) => x.usuario_id === u2.id)
          mapa[u2.id] = String(doResumo?.valor_fixo_mensal ?? 0)
        }
        setFixos(mapa)
      })
      .catch(() => setErro('Não foi possível carregar as comissões. Verifique se o backend está rodando.'))
      .finally(() => setCarregando(false))
    carregarPendentes()
  }

  async function aprovarAvulsa(a: ComissaoAvulsa) {
    setProcessandoAvulsa(a.id)
    try {
      await comissoesApi.avulsas.aprovar(a.id)
      carregar()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao aprovar.')
    } finally {
      setProcessandoAvulsa(null)
    }
  }

  async function recusarAvulsa(a: ComissaoAvulsa) {
    const motivo = prompt('Motivo da recusa (opcional):') ?? undefined
    setProcessandoAvulsa(a.id)
    try {
      await comissoesApi.avulsas.recusar(a.id, motivo)
      carregar()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao recusar.')
    } finally {
      setProcessandoAvulsa(null)
    }
  }

  useEffect(carregar, [mes, ano])

  async function salvarFixo(usuarioId: string) {
    setSalvandoFixo(usuarioId)
    try {
      await comissoesApi.definirFixo(usuarioId, Number(fixos[usuarioId]) || 0)
      carregar()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao salvar valor fixo.')
    } finally {
      setSalvandoFixo(null)
    }
  }

  async function lancarComoDespesa(usuarioId: string) {
    setLancando(usuarioId)
    try {
      await comissoesApi.lancar({ usuario_id: usuarioId, mes, ano })
      alert('Comissão lançada como despesa da clínica.')
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao lançar comissão.')
    } finally {
      setLancando(null)
    }
  }

  async function adicionarParticipante() {
    setSalvandoParticipante(true)
    setErroParticipante(null)
    try {
      await comissoesApi.adicionarParticipante(formParticipante)
      setFormParticipante({ cirurgia_id: '', usuario_id: '', valor_comissao: 0 })
      carregar()
    } catch (err) {
      setErroParticipante(err instanceof ApiError ? err.message : 'Erro ao vincular participação.')
    } finally {
      setSalvandoParticipante(false)
    }
  }

  return (
    <div>
      <SeletorMesAno mes={mes} ano={ano} onMes={setMes} onAno={setAno} />

      {erro && <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">{erro}</div>}

      <h2 className="font-semibold text-slate-800 mb-2">Valor fixo mensal por pessoa</h2>
      <Card className="overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium">Perfil</th>
                <th className="px-4 py-2.5 font-medium">Valor fixo mensal</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{u.nome}</td>
                  <td className="px-4 py-2.5">
                    <Badge>{rotulosRole[u.role] ?? u.role}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Input
                      type="number"
                      className="max-w-[140px]"
                      value={fixos[u.id] ?? '0'}
                      onChange={(e) => setFixos({ ...fixos, [u.id]: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="secondary" disabled={salvandoFixo === u.id} onClick={() => salvarFixo(u.id)}>
                      {salvandoFixo === u.id ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <h2 className="font-semibold text-slate-800 mb-2">Vincular participação em cirurgia</h2>
      <Card className="p-4 mb-6 space-y-3 max-w-2xl">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Cirurgia</Label>
            <Select
              value={formParticipante.cirurgia_id}
              onChange={(e) => setFormParticipante({ ...formParticipante, cirurgia_id: e.target.value })}
            >
              <option value="">Selecione...</option>
              {cirurgias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome_cirurgia} — {c.paciente_nome} ({formatarData(c.data_prevista)})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Pessoa</Label>
            <Select
              value={formParticipante.usuario_id}
              onChange={(e) => setFormParticipante({ ...formParticipante, usuario_id: e.target.value })}
            >
              <option value="">Selecione...</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="max-w-[200px]">
          <Label>Valor combinado</Label>
          <Input
            type="number"
            value={formParticipante.valor_comissao || ''}
            onChange={(e) => setFormParticipante({ ...formParticipante, valor_comissao: Number(e.target.value) })}
          />
        </div>
        {erroParticipante && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroParticipante}</p>}
        <Button
          onClick={adicionarParticipante}
          disabled={salvandoParticipante || !formParticipante.cirurgia_id || !formParticipante.usuario_id || !formParticipante.valor_comissao}
        >
          {salvandoParticipante ? 'Salvando...' : '+ Vincular participação'}
        </Button>
      </Card>

      <h2 className="font-semibold text-slate-800 mb-2">Comissões avulsas pendentes de aprovação</h2>
      {pendentes.length === 0 ? (
        <p className="text-sm text-slate-400 mb-6">Nenhuma pendente no momento.</p>
      ) : (
        <div className="space-y-2 mb-6">
          {pendentes.map((a) => (
            <Card key={a.id} className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {a.usuario_nome} — {a.paciente_nome} ({a.nome_cirurgia})
                </p>
                <p className="text-xs text-slate-400">{formatarData(a.data)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="text-sm font-semibold text-slate-800">{moeda(a.valor)}</p>
                <Button variant="secondary" disabled={processandoAvulsa === a.id} onClick={() => aprovarAvulsa(a)}>
                  Aprovar
                </Button>
                <Button variant="danger" disabled={processandoAvulsa === a.id} onClick={() => recusarAvulsa(a)}>
                  Recusar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="font-semibold text-slate-800 mb-2">Resumo do mês</h2>
      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : !resumo || resumo.resumo.length === 0 ? (
        <EmptyState text="Ninguém com comissão configurada ou com procedimento vinculado neste mês." />
      ) : (
        <div className="space-y-3">
          {resumo.resumo.map((r) => (
            <Card key={r.usuario_id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800">{r.usuario_nome}</p>
                    <Badge>{rotulosRole[r.role] ?? r.role}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Fixo: {moeda(r.valor_fixo_mensal)} · Procedimentos: {moeda(r.total_procedimentos)} ({r.procedimentos.length}) · Avulsas
                    aprovadas: {moeda(r.total_avulsas_aprovadas)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-800">{moeda(r.total)}</p>
                  <Button variant="secondary" disabled={lancando === r.usuario_id || r.total <= 0} onClick={() => lancarComoDespesa(r.usuario_id)}>
                    {lancando === r.usuario_id ? 'Lançando...' : 'Lançar como despesa'}
                  </Button>
                </div>
              </div>
              {r.procedimentos.length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-2 space-y-1">
                  {r.procedimentos.map((p) => (
                    <p key={p.id} className="text-xs text-slate-500">
                      {p.nome_cirurgia} ({formatarData(p.data_prevista)}) — {moeda(p.valor_comissao)}
                    </p>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
