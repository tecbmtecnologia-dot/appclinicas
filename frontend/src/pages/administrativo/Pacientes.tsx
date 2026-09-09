import { useEffect, useRef, useState } from 'react'
import { FileSignature, FileText, Trash2, UserCircle2, Users, Wallet } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Select } from '../../components/ui'
import CapturaFoto from '../../components/CapturaFoto'
import { buscarEnderecoPorCep, pacientesApi } from '../../api/pacientes'
import { pagamentosApi } from '../../api/pagamentos'
import { notasFiscaisPacienteApi } from '../../api/notasFiscaisPaciente'
import { contratosPacienteApi } from '../../api/contratosPaciente'
import { useAuth } from '../../contexts/AuthContext'
import { ApiError } from '../../api/client'
import type { ContratoPaciente, CorRaca, EstadoCivil, NotaFiscalPaciente, Pagamento, Paciente } from '../../types'

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function statusTone(status: string) {
  return status === 'pago' ? 'green' : status === 'atrasado' ? 'red' : 'amber'
}

const vazio = {
  nome: '',
  cpf: '',
  rg: '',
  data_nascimento: '',
  telefone: '',
  email: '',
  convenio: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  estado_civil: '' as EstadoCivil | '',
  data_primeira_consulta: '',
  nome_responsavel: '',
  profissao: '',
  cor_raca: '' as CorRaca | '',
  peso_kg: '',
  altura_cm: '',
  indicado_por: '',
  plano: '',
  validade_carteira: '',
  cartao_cns: '',
}

type FormPaciente = typeof vazio

const ROTULOS_ESTADO_CIVIL: Record<EstadoCivil, string> = {
  solteiro: 'Solteiro(a)',
  casado: 'Casado(a)',
  divorciado: 'Divorciado(a)',
  viuvo: 'Viúvo(a)',
  uniao_estavel: 'União estável',
  outro: 'Outro',
}

const ROTULOS_COR_RACA: Record<CorRaca, string> = {
  branca: 'Branca',
  preta: 'Preta',
  parda: 'Parda',
  amarela: 'Amarela',
  indigena: 'Indígena',
  nao_informado: 'Não informado',
}

function SecaoTitulo({ children }: { children: string }) {
  return <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-3 border-t border-slate-100">{children}</p>
}

export default function Pacientes() {
  const { usuario } = useAuth()
  const podeGerenciarPacientes = usuario ? ['admin', 'coordenador', 'recepcao'].includes(usuario.role) : false
  const podeVerFinanceiro = usuario ? ['admin', 'recepcao', 'financeiro'].includes(usuario.role) : false
  const podeExcluirNota = usuario ? ['admin', 'financeiro'].includes(usuario.role) : false
  const podeVerContratos = usuario ? ['admin', 'coordenador', 'recepcao', 'financeiro'].includes(usuario.role) : false
  const podeEnviarContrato = usuario ? ['admin', 'coordenador', 'recepcao'].includes(usuario.role) : false
  const podeExcluirContrato = usuario ? ['admin', 'coordenador'].includes(usuario.role) : false
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Paciente | null>(null)
  const [form, setForm] = useState<FormPaciente>(vazio)
  const [fotoBlob, setFotoBlob] = useState<Blob | null>(null)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [erroForm, setErroForm] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    pacientesApi
      .listar()
      .then(setPacientes)
      .catch(() => setErro('Não foi possível carregar pacientes. Verifique se o backend está rodando.'))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  function abrirNovo() {
    setEditando(null)
    setForm(vazio)
    setFotoBlob(null)
    setErroForm(null)
    setModalAberto(true)
  }

  function abrirEdicao(p: Paciente) {
    setEditando(p)
    setForm({
      nome: p.nome,
      cpf: p.cpf ?? '',
      rg: p.rg ?? '',
      data_nascimento: p.data_nascimento ?? '',
      telefone: p.telefone ?? '',
      email: p.email ?? '',
      convenio: p.convenio ?? '',
      cep: p.cep ?? '',
      logradouro: p.logradouro ?? '',
      numero: p.numero ?? '',
      complemento: p.complemento ?? '',
      bairro: p.bairro ?? '',
      cidade: p.cidade ?? '',
      estado: p.estado ?? '',
      estado_civil: p.estado_civil ?? '',
      data_primeira_consulta: p.data_primeira_consulta ?? '',
      nome_responsavel: p.nome_responsavel ?? '',
      profissao: p.profissao ?? '',
      cor_raca: p.cor_raca ?? '',
      peso_kg: p.peso_kg != null ? String(p.peso_kg) : '',
      altura_cm: p.altura_cm != null ? String(p.altura_cm) : '',
      indicado_por: p.indicado_por ?? '',
      plano: p.plano ?? '',
      validade_carteira: p.validade_carteira ?? '',
      cartao_cns: p.cartao_cns ?? '',
    })
    setFotoBlob(null)
    setErroForm(null)
    setModalAberto(true)
  }

  async function onCepChange(valor: string) {
    setForm((f) => ({ ...f, cep: valor }))
    const limpo = valor.replace(/\D/g, '')
    if (limpo.length === 8) {
      setBuscandoCep(true)
      const dados = await buscarEnderecoPorCep(valor)
      setBuscandoCep(false)
      if (dados) {
        setForm((f) => ({ ...f, logradouro: dados.logradouro, bairro: dados.bairro, cidade: dados.localidade, estado: dados.uf }))
      }
    }
  }

  async function salvar() {
    setSalvando(true)
    setErroForm(null)
    try {
      const dados = {
        ...form,
        peso_kg: form.peso_kg ? Number(form.peso_kg) : null,
        altura_cm: form.altura_cm ? Number(form.altura_cm) : null,
      }
      let paciente: Paciente
      if (editando) {
        paciente = await pacientesApi.atualizar(editando.id, dados)
      } else {
        paciente = await pacientesApi.criar(dados as unknown as Omit<Paciente, 'id' | 'created_at'>)
      }
      if (fotoBlob) {
        await pacientesApi.enviarFoto(paciente.id, fotoBlob)
      }
      setModalAberto(false)
      carregar()
    } catch {
      setErroForm('Erro ao salvar paciente.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(p: Paciente) {
    if (!confirm(`Remover o paciente ${p.nome}?`)) return
    try {
      await pacientesApi.remover(p.id)
      carregar()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao remover paciente.')
    }
  }

  const [financeiroDe, setFinanceiroDe] = useState<Paciente | null>(null)
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscalPaciente[]>([])
  const [carregandoFinanceiro, setCarregandoFinanceiro] = useState(false)
  const [descricaoNota, setDescricaoNota] = useState('')
  const [enviandoNota, setEnviandoNota] = useState(false)
  const [erroNota, setErroNota] = useState<string | null>(null)
  const inputNotaRef = useRef<HTMLInputElement>(null)

  function abrirFinanceiro(p: Paciente) {
    setFinanceiroDe(p)
    setDescricaoNota('')
    setErroNota(null)
    setCarregandoFinanceiro(true)
    Promise.all([pagamentosApi.listar({ paciente_id: p.id }), notasFiscaisPacienteApi.listar(p.id)])
      .then(([pg, nf]) => {
        setPagamentos(pg)
        setNotasFiscais(nf)
      })
      .finally(() => setCarregandoFinanceiro(false))
  }

  function carregarNotasFiscais() {
    if (!financeiroDe) return
    notasFiscaisPacienteApi.listar(financeiroDe.id).then(setNotasFiscais)
  }

  async function enviarNotaFiscal(arquivo: File) {
    if (!financeiroDe) return
    setEnviandoNota(true)
    setErroNota(null)
    try {
      await notasFiscaisPacienteApi.criar(financeiroDe.id, arquivo, descricaoNota)
      setDescricaoNota('')
      carregarNotasFiscais()
    } catch (err) {
      setErroNota(err instanceof ApiError ? err.message : 'Erro ao enviar a nota fiscal.')
    } finally {
      setEnviandoNota(false)
    }
  }

  async function removerNotaFiscal(n: NotaFiscalPaciente) {
    if (!confirm('Remover esta nota fiscal?')) return
    await notasFiscaisPacienteApi.remover(n.id)
    carregarNotasFiscais()
  }

  const [contratosDe, setContratosDe] = useState<Paciente | null>(null)
  const [contratos, setContratos] = useState<ContratoPaciente[]>([])
  const [carregandoContratos, setCarregandoContratos] = useState(false)
  const [descricaoContrato, setDescricaoContrato] = useState('')
  const [enviandoContrato, setEnviandoContrato] = useState(false)
  const [erroContrato, setErroContrato] = useState<string | null>(null)
  const inputContratoRef = useRef<HTMLInputElement>(null)

  function abrirContratos(p: Paciente) {
    setContratosDe(p)
    setDescricaoContrato('')
    setErroContrato(null)
    setCarregandoContratos(true)
    contratosPacienteApi
      .listar(p.id)
      .then(setContratos)
      .finally(() => setCarregandoContratos(false))
  }

  function carregarContratos() {
    if (!contratosDe) return
    contratosPacienteApi.listar(contratosDe.id).then(setContratos)
  }

  async function enviarContrato(arquivo: File) {
    if (!contratosDe) return
    setEnviandoContrato(true)
    setErroContrato(null)
    try {
      await contratosPacienteApi.criar(contratosDe.id, arquivo, descricaoContrato)
      setDescricaoContrato('')
      carregarContratos()
    } catch (err) {
      setErroContrato(err instanceof ApiError ? err.message : 'Erro ao enviar o contrato.')
    } finally {
      setEnviandoContrato(false)
    }
  }

  async function removerContrato(c: ContratoPaciente) {
    if (!confirm('Remover este contrato?')) return
    await contratosPacienteApi.remover(c.id)
    carregarContratos()
  }

  const [enviandoComprovanteDe, setEnviandoComprovanteDe] = useState<string | null>(null)

  async function enviarComprovante(pg: Pagamento, arquivo: File) {
    setEnviandoComprovanteDe(pg.id)
    try {
      const atualizado = await pagamentosApi.enviarComprovante(pg.id, arquivo)
      setPagamentos((lista) => lista.map((p) => (p.id === atualizado.id ? atualizado : p)))
    } catch {
      alert('Erro ao enviar o comprovante.')
    } finally {
      setEnviandoComprovanteDe(null)
    }
  }

  const filtrados = pacientes.filter((p) =>
    `${p.nome} ${p.cpf}`.toLowerCase().includes(busca.toLowerCase()),
  )

  return (
    <div>
      <PageHeader
        title="Pacientes"
        subtitle="Cadastro de pacientes da clínica"
        icon={Users}
        action={podeGerenciarPacientes ? <Button onClick={abrirNovo}>+ Novo paciente</Button> : undefined}
      />

      {erro && <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">{erro}</div>}

      <div className="mb-4 max-w-sm">
        <Input placeholder="Buscar por nome ou CPF..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <EmptyState text="Nenhum paciente cadastrado ainda." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium"></th>
                  <th className="px-4 py-2.5 font-medium">Nome</th>
                  <th className="px-4 py-2.5 font-medium">CPF</th>
                  <th className="px-4 py-2.5 font-medium">Telefone</th>
                  <th className="px-4 py-2.5 font-medium">Convênio</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-2.5">
                      {p.foto_url ? (
                        <img src={p.foto_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <UserCircle2 className="h-5 w-5 text-slate-300" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{p.nome}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.cpf}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.telefone}</td>
                    <td className="px-4 py-2.5">
                      {p.convenio ? <Badge tone="blue">{p.convenio}</Badge> : <Badge>Particular</Badge>}
                    </td>
                    <td className="px-4 py-2.5 text-right space-x-2 whitespace-nowrap">
                      {podeVerFinanceiro && (
                        <Button variant="ghost" onClick={() => abrirFinanceiro(p)}>
                          <Wallet className="h-3.5 w-3.5" /> Financeiro
                        </Button>
                      )}
                      {podeVerContratos && (
                        <Button variant="ghost" onClick={() => abrirContratos(p)}>
                          <FileSignature className="h-3.5 w-3.5" /> Contratos
                        </Button>
                      )}
                      {podeGerenciarPacientes && (
                        <>
                          <Button variant="ghost" onClick={() => abrirEdicao(p)}>
                            Editar
                          </Button>
                          <Button variant="danger" onClick={() => remover(p)}>
                            Remover
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editando ? 'Editar paciente' : 'Novo paciente'}>
        <div className="space-y-3">
          <CapturaFoto fotoAtualUrl={editando?.foto_url} onNovaFoto={setFotoBlob} />

          <div>
            <Label>Nome completo</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>CPF</Label>
              <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
            </div>
            <div>
              <Label>RG</Label>
              <Input value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} />
            </div>
            <div>
              <Label>Data de nascimento</Label>
              <Input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Estado civil</Label>
              <Select value={form.estado_civil} onChange={(e) => setForm({ ...form, estado_civil: e.target.value as EstadoCivil })}>
                <option value="">Selecione...</option>
                {Object.entries(ROTULOS_ESTADO_CIVIL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Cor/raça</Label>
              <Select value={form.cor_raca} onChange={(e) => setForm({ ...form, cor_raca: e.target.value as CorRaca })}>
                <option value="">Selecione...</option>
                {Object.entries(ROTULOS_COR_RACA).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Profissão</Label>
              <Input value={form.profissao} onChange={(e) => setForm({ ...form, profissao: e.target.value })} />
            </div>
            <div>
              <Label>Nome do responsável</Label>
              <Input value={form.nome_responsavel} onChange={(e) => setForm({ ...form, nome_responsavel: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Peso (kg)</Label>
              <Input type="number" step="0.1" value={form.peso_kg} onChange={(e) => setForm({ ...form, peso_kg: e.target.value })} />
            </div>
            <div>
              <Label>Altura (cm)</Label>
              <Input type="number" value={form.altura_cm} onChange={(e) => setForm({ ...form, altura_cm: e.target.value })} />
            </div>
            <div>
              <Label>Primeira consulta</Label>
              <Input
                type="date"
                value={form.data_primeira_consulta}
                onChange={(e) => setForm({ ...form, data_primeira_consulta: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Indicado por</Label>
            <Input value={form.indicado_por} onChange={(e) => setForm({ ...form, indicado_por: e.target.value })} />
          </div>

          <SecaoTitulo>Endereço</SecaoTitulo>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CEP {buscandoCep && <span className="text-slate-400 normal-case">(buscando...)</span>}</Label>
              <Input value={form.cep} onChange={(e) => onCepChange(e.target.value)} placeholder="00000-000" />
            </div>
            <div>
              <Label>Logradouro</Label>
              <Input value={form.logradouro} onChange={(e) => setForm({ ...form, logradouro: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Número</Label>
              <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
            </div>
            <div>
              <Label>Complemento</Label>
              <Input value={form.complemento} onChange={(e) => setForm({ ...form, complemento: e.target.value })} />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
            </div>
            <div>
              <Label>Estado (UF)</Label>
              <Input maxLength={2} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })} />
            </div>
          </div>

          <SecaoTitulo>Convênio</SecaoTitulo>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Convênio (deixe em branco se particular)</Label>
              <Input value={form.convenio} onChange={(e) => setForm({ ...form, convenio: e.target.value })} />
            </div>
            <div>
              <Label>Plano</Label>
              <Input value={form.plano} onChange={(e) => setForm({ ...form, plano: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Validade da carteirinha</Label>
              <Input
                type="date"
                value={form.validade_carteira}
                onChange={(e) => setForm({ ...form, validade_carteira: e.target.value })}
              />
            </div>
            <div>
              <Label>Cartão CNS</Label>
              <Input value={form.cartao_cns} onChange={(e) => setForm({ ...form, cartao_cns: e.target.value })} />
            </div>
          </div>

          {erroForm && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroForm}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando || !form.nome}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!financeiroDe}
        onClose={() => setFinanceiroDe(null)}
        title={financeiroDe ? `Financeiro — ${financeiroDe.nome}` : ''}
      >
        <div className="space-y-4">
          {carregandoFinanceiro ? (
            <p className="text-sm text-slate-400">Carregando...</p>
          ) : (
            <>
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pagamentos</h3>
                {pagamentos.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhum pagamento registrado.</p>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {pagamentos.map((pg) => (
                      <div key={pg.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{pg.descricao}</p>
                          <p className="text-xs text-slate-400">{pg.data_vencimento ?? '—'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <p className="text-sm font-semibold text-slate-800">{moeda(pg.valor)}</p>
                          <Badge tone={statusTone(pg.status)}>{pg.status}</Badge>
                          {pg.comprovante_url ? (
                            <a
                              href={pg.comprovante_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-700 hover:text-brand-800"
                              title="Ver comprovante"
                            >
                              <FileText className="h-4 w-4" />
                            </a>
                          ) : (
                            <label className="text-xs font-medium text-brand-700 hover:text-brand-800 cursor-pointer whitespace-nowrap">
                              {enviandoComprovanteDe === pg.id ? 'Enviando...' : '+ Comprovante'}
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                disabled={enviandoComprovanteDe === pg.id}
                                onChange={(e) => {
                                  const arquivo = e.target.files?.[0]
                                  if (arquivo) enviarComprovante(pg, arquivo)
                                  e.target.value = ''
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notas fiscais</h3>
                {notasFiscais.length === 0 ? (
                  <p className="text-sm text-slate-400 mb-2">Nenhuma nota fiscal enviada.</p>
                ) : (
                  <div className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
                    {notasFiscais.map((n) => (
                      <div key={n.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                        <a
                          href={n.arquivo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 min-w-0 text-brand-700 hover:text-brand-800"
                        >
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="text-sm truncate">{n.descricao || n.nome_arquivo || 'Nota fiscal'}</span>
                        </a>
                        {podeExcluirNota && (
                          <button onClick={() => removerNotaFiscal(n)} className="text-slate-400 hover:text-red-600 shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="Descrição (opcional)"
                    value={descricaoNota}
                    onChange={(e) => setDescricaoNota(e.target.value)}
                  />
                  <input
                    ref={inputNotaRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const arquivo = e.target.files?.[0]
                      if (arquivo) enviarNotaFiscal(arquivo)
                      e.target.value = ''
                    }}
                  />
                  <Button variant="secondary" onClick={() => inputNotaRef.current?.click()} disabled={enviandoNota}>
                    {enviandoNota ? 'Enviando...' : '+ PDF'}
                  </Button>
                </div>
                {erroNota && <p className="text-sm text-red-600 mt-2">{erroNota}</p>}
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal
        open={!!contratosDe}
        onClose={() => setContratosDe(null)}
        title={contratosDe ? `Contratos — ${contratosDe.nome}` : ''}
      >
        <div className="space-y-4">
          {carregandoContratos ? (
            <p className="text-sm text-slate-400">Carregando...</p>
          ) : (
            <>
              {contratos.length === 0 ? (
                <p className="text-sm text-slate-400 mb-2">Nenhum contrato enviado.</p>
              ) : (
                <div className="space-y-1.5 mb-3 max-h-64 overflow-y-auto">
                  {contratos.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                      <a
                        href={c.arquivo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 min-w-0 text-brand-700 hover:text-brand-800"
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="text-sm truncate">{c.descricao || c.nome_arquivo || 'Contrato'}</span>
                      </a>
                      {podeExcluirContrato && (
                        <button onClick={() => removerContrato(c)} className="text-slate-400 hover:text-red-600 shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {podeEnviarContrato && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Descrição (opcional)"
                    value={descricaoContrato}
                    onChange={(e) => setDescricaoContrato(e.target.value)}
                  />
                  <input
                    ref={inputContratoRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const arquivo = e.target.files?.[0]
                      if (arquivo) enviarContrato(arquivo)
                      e.target.value = ''
                    }}
                  />
                  <Button variant="secondary" onClick={() => inputContratoRef.current?.click()} disabled={enviandoContrato}>
                    {enviandoContrato ? 'Enviando...' : '+ PDF'}
                  </Button>
                </div>
              )}
              {erroContrato && <p className="text-sm text-red-600 mt-2">{erroContrato}</p>}
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
