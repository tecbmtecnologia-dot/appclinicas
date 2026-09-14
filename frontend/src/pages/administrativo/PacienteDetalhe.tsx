import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Activity, Camera, CheckCircle2, FileText, FlaskConical, Printer, Scissors, Shield, Trash2, UserCircle2 } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Select, Textarea } from '../../components/ui'
import CapturaFoto from '../../components/CapturaFoto'
import { buscarEnderecoPorCep, pacientesApi } from '../../api/pacientes'
import { medicosApi } from '../../api/medicos'
import { prontuariosApi } from '../../api/prontuarios'
import { modelosReceitaApi } from '../../api/modelosReceita'
import { modelosExameApi } from '../../api/modelosExame'
import { fotosPacienteApi } from '../../api/fotosPaciente'
import { sessoesFisioterapiaApi } from '../../api/sessoesFisioterapia'
import { agendamentosApi } from '../../api/agendamentos'
import { orcamentosApi, type ItemOrcamentoInput, type OrcamentoForm } from '../../api/orcamentos'
import { pagamentosApi } from '../../api/pagamentos'
import { notasFiscaisPacienteApi } from '../../api/notasFiscaisPaciente'
import { contratosPacienteApi } from '../../api/contratosPaciente'
import { contratoModeloApi } from '../../api/contratoModelo'
import { cirurgiasApi } from '../../api/cirurgias'
import { useAuth } from '../../contexts/AuthContext'
import { ApiError } from '../../api/client'
import type {
  AuditoriaProntuario,
  ContratoPaciente,
  CorRaca,
  Cirurgia,
  EstadoCivil,
  FotoPaciente,
  ItemOrcamentoCatalogo,
  Medico,
  ModeloExame,
  ModeloOrcamento,
  ModeloReceita,
  NotaFiscalPaciente,
  Orcamento,
  Paciente,
  PedidoExameResumo,
  Pagamento,
  Prontuario as ProntuarioType,
  ReceitaResumo,
  SessaoFisioterapia,
  Sexo,
  TipoFotoPaciente,
} from '../../types'

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

function formatarDataBr(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-BR')
}

function formatarData(v?: string | null) {
  if (!v) return '—'
  const d = new Date(v.includes('T') || v.includes(' ') ? v.replace(' ', 'T') : `${v}T00:00:00`)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleDateString('pt-BR')
}

function formatarDataHora(v?: string | null) {
  if (!v) return '—'
  const d = new Date(v.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const ACAO_AUDITORIA_LABEL: Record<string, string> = {
  leitura: 'Visualizou o prontuário',
  leitura_pdf_historico: 'Baixou o histórico em PDF',
  criacao: 'Criou um registro',
  edicao: 'Editou um registro',
  exclusao: 'Excluiu um registro',
}

function statusPagamentoTone(status: string) {
  return status === 'pago' ? 'green' : status === 'atrasado' ? 'red' : 'amber'
}

const ROTULOS_TIPO_FOTO: Record<TipoFotoPaciente, string> = {
  pre_operatorio: 'Pré-operatório',
  pos_operatorio: 'Pós-operatório',
}

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

const ROTULOS_SEXO: Record<Sexo, string> = {
  feminino: 'Feminino',
  masculino: 'Masculino',
  nao_informado: 'Não informado',
}

const vazioDados = {
  nome: '',
  cpf: '',
  rg: '',
  sexo: '' as Sexo | '',
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
  nome_mae: '',
  profissao: '',
  cor_raca: '' as CorRaca | '',
  peso_kg: '',
  altura_cm: '',
  indicado_por: '',
  plano: '',
  validade_carteira: '',
  cartao_cns: '',
  consentimento_lgpd: false,
}
type FormDados = typeof vazioDados

const vazioEvolucao = { medico_id: '', data: hoje(), queixa: '', diagnostico: '', evolucao: '', observacoes: '' }
const vazioFoto: { tipo: TipoFotoPaciente; data: string; observacoes: string } = {
  tipo: 'pre_operatorio',
  data: hoje(),
  observacoes: '',
}
const vazioOrcamento: OrcamentoForm = { paciente_id: '', titulo: '', itens: [], observacoes: '' }

const ABAS = [
  { id: 'dados', label: 'Dados' },
  { id: 'prontuario', label: 'Prontuário' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'contratos', label: 'Contratos' },
  { id: 'cirurgias', label: 'Cirurgias' },
  { id: 'auditoria', label: 'Auditoria' },
] as const
type Aba = (typeof ABAS)[number]['id']

function SecaoTitulo({ children }: { children: string }) {
  return <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-3 border-t border-slate-100">{children}</p>
}

export default function PacienteDetalhe() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const role = usuario?.role

  const podeGerenciarPacientes = role ? ['admin', 'coordenador', 'recepcao'].includes(role) : false
  const podeVerProntuario = role ? ['admin', 'coordenador', 'medico', 'enfermagem', 'pj'].includes(role) : false
  const podeVerOrcamentos = role ? ['admin', 'financeiro', 'medico'].includes(role) : false
  const podeVerPagamentos = role ? ['admin', 'recepcao', 'financeiro'].includes(role) : false
  const podeVerContratos = role ? ['admin', 'coordenador', 'recepcao', 'financeiro'].includes(role) : false
  const podeEnviarContrato = role ? ['admin', 'coordenador', 'recepcao'].includes(role) : false
  const podeExcluirContrato = role === 'admin' || role === 'coordenador'
  const podeExcluirNota = role === 'admin' || role === 'financeiro'
  const podeVerCirurgias = role ? ['admin', 'coordenador', 'medico', 'enfermagem', 'recepcao', 'pj'].includes(role) : false
  // Quem consultou/alterou o prontuário é função de governança — só quem responde pela clínica.
  const podeVerAuditoria = role === 'admin' || role === 'coordenador'
  const podeVerFinanceiro = podeVerOrcamentos || podeVerPagamentos
  const ehEnfermagem = role === 'enfermagem' || role === 'pj'
  // Mesmas roles que já podem emitir prescrição/pedido de exames pelo prontuário
  // (CRIACAO no backend, exceto enfermagem/pj, que só registram evolução).
  const podeEmitirDocumentos = role ? ['admin', 'coordenador', 'medico', 'recepcao'].includes(role) : false
  // Ver/imprimir documentos já emitidos é aberto a qualquer perfil logado da
  // clínica, menos pj (fisioterapeuta/consultora) — removido a pedido do usuário.
  const podeVerDocumentos = role ? role !== 'pj' : false

  const abasVisiveis = ABAS.filter((a) => {
    if (a.id === 'prontuario') return podeVerProntuario
    if (a.id === 'documentos') return podeVerDocumentos
    if (a.id === 'financeiro') return podeVerFinanceiro
    if (a.id === 'contratos') return podeVerContratos
    if (a.id === 'cirurgias') return podeVerCirurgias
    if (a.id === 'auditoria') return podeVerAuditoria
    return true
  })

  const abaInicial = (searchParams.get('tab') as Aba | null) ?? 'dados'
  const [aba, setAba] = useState<Aba>(abasVisiveis.some((a) => a.id === abaInicial) ? abaInicial : 'dados')

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [carregandoPaciente, setCarregandoPaciente] = useState(true)
  const [erroPaciente, setErroPaciente] = useState<string | null>(null)

  function carregarPaciente() {
    if (!id) return
    setCarregandoPaciente(true)
    pacientesApi
      .obter(id)
      .then(setPaciente)
      .catch(() => setErroPaciente('Não foi possível carregar este paciente.'))
      .finally(() => setCarregandoPaciente(false))
  }

  useEffect(carregarPaciente, [id])

  // --- Dados ---
  const [modalDadosAberto, setModalDadosAberto] = useState(false)
  const [formDados, setFormDados] = useState<FormDados>(vazioDados)
  const [fotoBlob, setFotoBlob] = useState<Blob | null>(null)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [salvandoDados, setSalvandoDados] = useState(false)
  const [erroDados, setErroDados] = useState<string | null>(null)

  function abrirEdicaoDados() {
    if (!paciente) return
    setFormDados({
      nome: paciente.nome,
      cpf: paciente.cpf ?? '',
      rg: paciente.rg ?? '',
      sexo: paciente.sexo ?? '',
      data_nascimento: paciente.data_nascimento ?? '',
      telefone: paciente.telefone ?? '',
      email: paciente.email ?? '',
      convenio: paciente.convenio ?? '',
      cep: paciente.cep ?? '',
      logradouro: paciente.logradouro ?? '',
      numero: paciente.numero ?? '',
      complemento: paciente.complemento ?? '',
      bairro: paciente.bairro ?? '',
      cidade: paciente.cidade ?? '',
      estado: paciente.estado ?? '',
      estado_civil: paciente.estado_civil ?? '',
      data_primeira_consulta: paciente.data_primeira_consulta ?? '',
      nome_responsavel: paciente.nome_responsavel ?? '',
      nome_mae: paciente.nome_mae ?? '',
      profissao: paciente.profissao ?? '',
      cor_raca: paciente.cor_raca ?? '',
      peso_kg: paciente.peso_kg != null ? String(paciente.peso_kg) : '',
      altura_cm: paciente.altura_cm != null ? String(paciente.altura_cm) : '',
      indicado_por: paciente.indicado_por ?? '',
      plano: paciente.plano ?? '',
      validade_carteira: paciente.validade_carteira ?? '',
      cartao_cns: paciente.cartao_cns ?? '',
      consentimento_lgpd: !!paciente.consentimento_lgpd_em,
    })
    setFotoBlob(null)
    setErroDados(null)
    setModalDadosAberto(true)
  }

  async function onCepChange(valor: string) {
    setFormDados((f) => ({ ...f, cep: valor }))
    const limpo = valor.replace(/\D/g, '')
    if (limpo.length === 8) {
      setBuscandoCep(true)
      const dados = await buscarEnderecoPorCep(valor)
      setBuscandoCep(false)
      if (dados) {
        setFormDados((f) => ({ ...f, logradouro: dados.logradouro, bairro: dados.bairro, cidade: dados.localidade, estado: dados.uf }))
      }
    }
  }

  async function salvarDados() {
    if (!paciente) return
    setSalvandoDados(true)
    setErroDados(null)
    try {
      const dados = {
        ...formDados,
        peso_kg: formDados.peso_kg ? Number(formDados.peso_kg) : null,
        altura_cm: formDados.altura_cm ? Number(formDados.altura_cm) : null,
        estado_civil: formDados.estado_civil || null,
        cor_raca: formDados.cor_raca || null,
        sexo: formDados.sexo || null,
      }
      const atualizado = await pacientesApi.atualizar(paciente.id, dados)
      if (fotoBlob) await pacientesApi.enviarFoto(paciente.id, fotoBlob)
      setPaciente(atualizado)
      setModalDadosAberto(false)
      carregarPaciente()
    } catch {
      setErroDados('Erro ao salvar paciente.')
    } finally {
      setSalvandoDados(false)
    }
  }

  async function removerPaciente() {
    if (!paciente) return
    if (!confirm(`Remover o paciente ${paciente.nome}? Essa ação não pode ser desfeita.`)) return
    try {
      await pacientesApi.remover(paciente.id)
      navigate('/administrativo/pacientes')
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao remover paciente.')
    }
  }

  // --- Prontuário ---
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [registros, setRegistros] = useState<ProntuarioType[]>([])
  const [carregandoProntuario, setCarregandoProntuario] = useState(false)
  const [formEvolucao, setFormEvolucao] = useState(vazioEvolucao)
  const [salvandoEvolucao, setSalvandoEvolucao] = useState(false)
  const [mostrarFormEvolucao, setMostrarFormEvolucao] = useState(false)
  const [agendamentoId, setAgendamentoId] = useState<string | null>(null)
  const [finalizandoAtendimento, setFinalizandoAtendimento] = useState(false)
  const [atendimentoFinalizado, setAtendimentoFinalizado] = useState(false)
  const [modelosReceita, setModelosReceita] = useState<ModeloReceita[]>([])
  const [itensPrescricao, setItensPrescricao] = useState<string[]>([])
  const [modeloParaInserir, setModeloParaInserir] = useState('')
  const [itemPrescricaoLivre, setItemPrescricaoLivre] = useState('')
  const [modelosExame, setModelosExame] = useState<ModeloExame[]>([])
  const [itensPedidoExames, setItensPedidoExames] = useState<string[]>([])
  const [modeloExameParaInserir, setModeloExameParaInserir] = useState('')
  const [itemExameLivre, setItemExameLivre] = useState('')
  const [fotos, setFotos] = useState<FotoPaciente[]>([])
  const [modalFotoAberto, setModalFotoAberto] = useState(false)
  const [formFoto, setFormFoto] = useState(vazioFoto)
  const [fotoBlobNova, setFotoBlobNova] = useState<Blob | null>(null)
  const [salvandoFoto, setSalvandoFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState<string | null>(null)
  const [sessoesFisio, setSessoesFisio] = useState<SessaoFisioterapia[]>([])

  useEffect(() => {
    if (!podeVerProntuario) return
    medicosApi.listar().then(setMedicos).catch(() => {})
    if (!ehEnfermagem) {
      modelosReceitaApi.listar().then(setModelosReceita).catch(() => {})
      modelosExameApi.listar().then(setModelosExame).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeVerProntuario])

  // Vem do botão "Atender" na Agenda — já abre na aba de prontuário com o
  // formulário pronto pra começar a evolução na hora.
  useEffect(() => {
    if (searchParams.get('tab') !== 'prontuario') return
    setAgendamentoId(searchParams.get('agendamento'))
    setMostrarFormEvolucao(true)
    if (usuario?.medico_id) setFormEvolucao((f) => ({ ...f, medico_id: usuario.medico_id! }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function finalizarAtendimento() {
    if (!agendamentoId) return
    if (!confirm('Tem certeza que terminou a evolução deste atendimento? Depois de finalizar, não será possível atendê-lo novamente.')) return
    setFinalizandoAtendimento(true)
    try {
      await agendamentosApi.atualizar(agendamentoId, { status: 'concluido' })
      setAtendimentoFinalizado(true)
      setTimeout(() => navigate('/agendamento'), 1200)
    } catch {
      alert('Erro ao finalizar o atendimento.')
    } finally {
      setFinalizandoAtendimento(false)
    }
  }

  function inserirModeloNaPrescricao() {
    const modelo = modelosReceita.find((m) => m.id === modeloParaInserir)
    if (!modelo) return
    setItensPrescricao((itens) => [...itens, modelo.texto])
    setModeloParaInserir('')
  }

  function inserirItemLivreNaPrescricao() {
    if (!itemPrescricaoLivre.trim()) return
    setItensPrescricao((itens) => [...itens, itemPrescricaoLivre.trim()])
    setItemPrescricaoLivre('')
  }

  function removerItemPrescricao(indice: number) {
    setItensPrescricao((itens) => itens.filter((_, i) => i !== indice))
  }

  function inserirModeloExameNoPedido() {
    const modelo = modelosExame.find((m) => m.id === modeloExameParaInserir)
    if (!modelo) return
    setItensPedidoExames((itens) => [...itens, modelo.texto])
    setModeloExameParaInserir('')
  }

  function inserirItemExameLivre() {
    if (!itemExameLivre.trim()) return
    setItensPedidoExames((itens) => [...itens, itemExameLivre.trim()])
    setItemExameLivre('')
  }

  function removerItemExame(indice: number) {
    setItensPedidoExames((itens) => itens.filter((_, i) => i !== indice))
  }

  function carregarFotos() {
    if (!id) return
    fotosPacienteApi.listar(id).then(setFotos).catch(() => {})
  }

  function abrirNovaFoto() {
    setFormFoto(vazioFoto)
    setFotoBlobNova(null)
    setErroFoto(null)
    setModalFotoAberto(true)
  }

  async function salvarFoto() {
    if (!id || !fotoBlobNova) return
    setSalvandoFoto(true)
    setErroFoto(null)
    try {
      await fotosPacienteApi.criar({ paciente_id: id, foto: fotoBlobNova, ...formFoto })
      setModalFotoAberto(false)
      carregarFotos()
    } catch (err) {
      setErroFoto(err instanceof ApiError ? err.message : 'Erro ao salvar foto.')
    } finally {
      setSalvandoFoto(false)
    }
  }

  async function removerFoto(f: FotoPaciente) {
    if (!confirm('Remover esta foto do histórico?')) return
    await fotosPacienteApi.remover(f.id)
    carregarFotos()
  }

  function carregarRegistros() {
    if (!id) return
    setCarregandoProntuario(true)
    prontuariosApi
      .listarPorPaciente(id)
      .then(setRegistros)
      .finally(() => setCarregandoProntuario(false))
  }

  function carregarSessoesFisio() {
    if (!id) return
    sessoesFisioterapiaApi.listar({ paciente_id: id }).then(setSessoesFisio).catch(() => {})
  }

  useEffect(() => {
    if (podeVerProntuario && id) {
      carregarRegistros()
      carregarFotos()
      carregarSessoesFisio()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeVerProntuario, id])

  async function salvarEvolucao() {
    if (!id) return
    setSalvandoEvolucao(true)
    try {
      await prontuariosApi.criar({
        ...formEvolucao,
        prescricao: itensPrescricao.join('\n\n'),
        pedido_exames: itensPedidoExames.join('\n\n'),
        paciente_id: id,
      })
      setFormEvolucao(vazioEvolucao)
      setItensPrescricao([])
      setItensPedidoExames([])
      setMostrarFormEvolucao(false)
      carregarRegistros()
    } catch {
      alert('Erro ao salvar registro do prontuário.')
    } finally {
      setSalvandoEvolucao(false)
    }
  }

  // --- Financeiro (orçamentos + pagamentos + notas fiscais) ---
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [catalogoAtivo, setCatalogoAtivo] = useState<ItemOrcamentoCatalogo[]>([])
  const [modelosOrcamentoAtivos, setModelosOrcamentoAtivos] = useState<ModeloOrcamento[]>([])
  const [carregandoOrcamentos, setCarregandoOrcamentos] = useState(false)
  const [modalOrcamentoAberto, setModalOrcamentoAberto] = useState(false)
  const [editandoOrcamentoId, setEditandoOrcamentoId] = useState<string | null>(null)
  const [formOrcamento, setFormOrcamento] = useState<OrcamentoForm>(vazioOrcamento)
  const [salvandoOrcamento, setSalvandoOrcamento] = useState(false)
  const [erroOrcamento, setErroOrcamento] = useState<string | null>(null)

  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscalPaciente[]>([])
  const [carregandoPagamentos, setCarregandoPagamentos] = useState(false)
  const [descricaoNota, setDescricaoNota] = useState('')
  const [enviandoNota, setEnviandoNota] = useState(false)
  const [erroNota, setErroNota] = useState<string | null>(null)
  const [enviandoComprovanteDe, setEnviandoComprovanteDe] = useState<string | null>(null)
  const inputNotaRef = useRef<HTMLInputElement>(null)

  function carregarOrcamentos() {
    if (!id) return
    setCarregandoOrcamentos(true)
    orcamentosApi
      .listar({ paciente_id: id })
      .then(setOrcamentos)
      .finally(() => setCarregandoOrcamentos(false))
    orcamentosApi.catalogo.listar(true).then(setCatalogoAtivo)
    orcamentosApi.modelos.listar(true).then(setModelosOrcamentoAtivos)
  }

  function carregarPagamentosEnotas() {
    if (!id) return
    setCarregandoPagamentos(true)
    Promise.all([pagamentosApi.listar({ paciente_id: id }), notasFiscaisPacienteApi.listar(id)])
      .then(([pg, nf]) => {
        setPagamentos(pg)
        setNotasFiscais(nf)
      })
      .finally(() => setCarregandoPagamentos(false))
  }

  useEffect(() => {
    if (podeVerOrcamentos && id) carregarOrcamentos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeVerOrcamentos, id])

  useEffect(() => {
    if (podeVerPagamentos && id) carregarPagamentosEnotas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeVerPagamentos, id])

  function abrirNovoOrcamento() {
    setFormOrcamento({ ...vazioOrcamento, paciente_id: id ?? '' })
    setEditandoOrcamentoId(null)
    setErroOrcamento(null)
    setModalOrcamentoAberto(true)
  }

  function abrirEdicaoOrcamento(o: Orcamento) {
    setFormOrcamento({
      paciente_id: o.paciente_id,
      titulo: o.titulo,
      itens: o.itens.map((it) => ({ item_id: it.item_id, quantidade: it.quantidade })),
      observacoes: o.observacoes ?? '',
      status: o.status,
    })
    setEditandoOrcamentoId(o.id)
    setErroOrcamento(null)
    setModalOrcamentoAberto(true)
  }

  function atualizarItemOrcamento(i: number, campo: keyof ItemOrcamentoInput, valor: string) {
    const itens = [...formOrcamento.itens]
    itens[i] = { ...itens[i], [campo]: campo === 'quantidade' ? Number(valor) : valor }
    setFormOrcamento({ ...formOrcamento, itens })
  }

  function adicionarItemOrcamento() {
    setFormOrcamento({ ...formOrcamento, itens: [...formOrcamento.itens, { item_id: '', quantidade: 1 }] })
  }

  function removerItemOrcamento(i: number) {
    setFormOrcamento({ ...formOrcamento, itens: formOrcamento.itens.filter((_, idx) => idx !== i) })
  }

  function valorItemOrcamento(item: ItemOrcamentoInput) {
    const catalogItem = catalogoAtivo.find((c) => c.id === item.item_id)
    return catalogItem ? catalogItem.valor * (Number(item.quantidade) || 1) : 0
  }

  const totalFormOrcamento = formOrcamento.itens.reduce((s, it) => s + valorItemOrcamento(it), 0)

  function aplicarModeloOrcamento(modeloId: string) {
    if (!modeloId) return
    const modelo = modelosOrcamentoAtivos.find((m) => m.id === modeloId)
    if (!modelo) return
    setFormOrcamento({ ...formOrcamento, itens: modelo.itens.map((it) => ({ item_id: it.item_id, quantidade: it.quantidade })) })
  }

  async function salvarOrcamento() {
    setSalvandoOrcamento(true)
    setErroOrcamento(null)
    try {
      const dados = { ...formOrcamento, itens: formOrcamento.itens.filter((it) => it.item_id) }
      if (editandoOrcamentoId) await orcamentosApi.atualizar(editandoOrcamentoId, dados)
      else await orcamentosApi.criar(dados)
      setModalOrcamentoAberto(false)
      carregarOrcamentos()
    } catch (err) {
      setErroOrcamento(err instanceof ApiError ? err.message : 'Erro ao salvar orçamento.')
    } finally {
      setSalvandoOrcamento(false)
    }
  }

  async function alterarStatusOrcamento(o: Orcamento, status: Orcamento['status']) {
    await orcamentosApi.atualizar(o.id, { status })
    carregarOrcamentos()
  }

  async function removerOrcamento(o: Orcamento) {
    if (!confirm(`Remover o orçamento "${o.titulo}"?`)) return
    await orcamentosApi.remover(o.id)
    carregarOrcamentos()
  }

  function carregarNotasFiscais() {
    if (!id) return
    notasFiscaisPacienteApi.listar(id).then(setNotasFiscais)
  }

  async function enviarNotaFiscal(arquivo: File) {
    if (!id) return
    setEnviandoNota(true)
    setErroNota(null)
    try {
      await notasFiscaisPacienteApi.criar(id, arquivo, descricaoNota)
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

  // --- Contratos ---
  const [contratos, setContratos] = useState<ContratoPaciente[]>([])
  const [carregandoContratos, setCarregandoContratos] = useState(false)
  const [descricaoContrato, setDescricaoContrato] = useState('')
  const [enviandoContrato, setEnviandoContrato] = useState(false)
  const [erroContrato, setErroContrato] = useState<string | null>(null)
  const inputContratoRef = useRef<HTMLInputElement>(null)
  const [gerandoContrato, setGerandoContrato] = useState(false)

  async function gerarContratoPdf() {
    if (!id) return
    setGerandoContrato(true)
    setErroContrato(null)
    try {
      await contratoModeloApi.gerarPdf(id)
    } catch (err) {
      setErroContrato(err instanceof Error ? err.message : 'Erro ao gerar o contrato.')
    } finally {
      setGerandoContrato(false)
    }
  }

  function carregarContratos() {
    if (!id) return
    setCarregandoContratos(true)
    contratosPacienteApi
      .listar(id)
      .then(setContratos)
      .finally(() => setCarregandoContratos(false))
  }

  useEffect(() => {
    if (podeVerContratos && id) carregarContratos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeVerContratos, id])

  async function enviarContrato(arquivo: File) {
    if (!id) return
    setEnviandoContrato(true)
    setErroContrato(null)
    try {
      await contratosPacienteApi.criar(id, arquivo, descricaoContrato)
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

  // --- Cirurgias ---
  const [cirurgias, setCirurgias] = useState<Cirurgia[]>([])
  const [carregandoCirurgias, setCarregandoCirurgias] = useState(false)

  function carregarCirurgias() {
    if (!id) return
    setCarregandoCirurgias(true)
    cirurgiasApi
      .listar({ paciente_id: id })
      .then(setCirurgias)
      .finally(() => setCarregandoCirurgias(false))
  }

  useEffect(() => {
    if (podeVerCirurgias && id) carregarCirurgias()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeVerCirurgias, id])

  // --- Auditoria (quem acessou/alterou o prontuário) ---
  const [auditoria, setAuditoria] = useState<AuditoriaProntuario[]>([])
  const [carregandoAuditoria, setCarregandoAuditoria] = useState(false)

  function carregarAuditoria() {
    if (!id) return
    setCarregandoAuditoria(true)
    prontuariosApi
      .listarAuditoriaPorPaciente(id)
      .then(setAuditoria)
      .finally(() => setCarregandoAuditoria(false))
  }

  useEffect(() => {
    if (podeVerAuditoria && id) carregarAuditoria()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeVerAuditoria, id])

  // --- Documentos (emissão rápida de receita/pedido de exames, sem preencher evolução) ---
  const [receitasDocs, setReceitasDocs] = useState<ReceitaResumo[]>([])
  const [pedidosExameDocs, setPedidosExameDocs] = useState<PedidoExameResumo[]>([])
  const [carregandoDocs, setCarregandoDocs] = useState(false)
  const [docMedicoId, setDocMedicoId] = useState('')
  const [docData, setDocData] = useState(hoje())
  const [docItensReceita, setDocItensReceita] = useState<string[]>([])
  const [docModeloReceita, setDocModeloReceita] = useState('')
  const [docItemReceitaLivre, setDocItemReceitaLivre] = useState('')
  const [docItensExame, setDocItensExame] = useState<string[]>([])
  const [docModeloExame, setDocModeloExame] = useState('')
  const [docItemExameLivre, setDocItemExameLivre] = useState('')
  const [emitindoReceitaDoc, setEmitindoReceitaDoc] = useState(false)
  const [emitindoExameDoc, setEmitindoExameDoc] = useState(false)
  const [erroDoc, setErroDoc] = useState('')

  function carregarDocumentos() {
    if (!id) return
    setCarregandoDocs(true)
    Promise.all([prontuariosApi.listarReceitasPorPaciente(id), prontuariosApi.listarPedidosExamePorPaciente(id)])
      .then(([r, e]) => {
        setReceitasDocs(r)
        setPedidosExameDocs(e)
      })
      .finally(() => setCarregandoDocs(false))
  }

  useEffect(() => {
    if (podeVerDocumentos && id) carregarDocumentos()
    if (podeEmitirDocumentos) {
      medicosApi.listar().then(setMedicos).catch(() => {})
      modelosReceitaApi.listar().then(setModelosReceita).catch(() => {})
      modelosExameApi.listar().then(setModelosExame).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeVerDocumentos, podeEmitirDocumentos, id])

  function inserirModeloReceitaNoDoc() {
    const modelo = modelosReceita.find((m) => m.id === docModeloReceita)
    if (!modelo) return
    setDocItensReceita((itens) => [...itens, modelo.texto])
    setDocModeloReceita('')
  }

  function inserirItemReceitaLivreNoDoc() {
    if (!docItemReceitaLivre.trim()) return
    setDocItensReceita((itens) => [...itens, docItemReceitaLivre.trim()])
    setDocItemReceitaLivre('')
  }

  function inserirModeloExameNoDoc() {
    const modelo = modelosExame.find((m) => m.id === docModeloExame)
    if (!modelo) return
    setDocItensExame((itens) => [...itens, modelo.texto])
    setDocModeloExame('')
  }

  function inserirItemExameLivreNoDoc() {
    if (!docItemExameLivre.trim()) return
    setDocItensExame((itens) => [...itens, docItemExameLivre.trim()])
    setDocItemExameLivre('')
  }

  async function emitirReceitaDoc() {
    if (!id || !docMedicoId || docItensReceita.length === 0) {
      setErroDoc('Selecione o médico responsável e monte a prescrição.')
      return
    }
    setErroDoc('')
    setEmitindoReceitaDoc(true)
    try {
      const criado = await prontuariosApi.criar({
        paciente_id: id,
        medico_id: docMedicoId,
        data: docData,
        queixa: '',
        diagnostico: '',
        prescricao: docItensReceita.join('\n\n'),
      })
      setDocItensReceita([])
      carregarDocumentos()
      await prontuariosApi.abrirReceitaPdf(criado.id).catch(() => {})
    } catch {
      setErroDoc('Não foi possível emitir a receita.')
    } finally {
      setEmitindoReceitaDoc(false)
    }
  }

  async function emitirExameDoc() {
    if (!id || !docMedicoId || docItensExame.length === 0) {
      setErroDoc('Selecione o médico responsável e monte o pedido de exames.')
      return
    }
    setErroDoc('')
    setEmitindoExameDoc(true)
    try {
      const criado = await prontuariosApi.criar({
        paciente_id: id,
        medico_id: docMedicoId,
        data: docData,
        queixa: '',
        diagnostico: '',
        prescricao: '',
        pedido_exames: docItensExame.join('\n\n'),
      })
      setDocItensExame([])
      carregarDocumentos()
      await prontuariosApi.abrirPedidoExamesPdf(criado.id).catch(() => {})
    } catch {
      setErroDoc('Não foi possível emitir o pedido de exames.')
    } finally {
      setEmitindoExameDoc(false)
    }
  }

  async function baixarRelatorioCirurgia(c: Cirurgia) {
    try {
      await cirurgiasApi.abrirRelatorioPdf(c.id)
    } catch {
      alert('Erro ao gerar o PDF do relatório.')
    }
  }

  const pesoAltura = useMemo(() => {
    if (!paciente?.peso_kg && !paciente?.altura_cm) return null
    const partes: string[] = []
    if (paciente?.peso_kg) partes.push(`${paciente.peso_kg} kg`)
    if (paciente?.altura_cm) partes.push(`${paciente.altura_cm} cm`)
    return partes.join(' · ')
  }, [paciente])

  if (carregandoPaciente) {
    return <p className="text-sm text-slate-400">Carregando...</p>
  }

  if (erroPaciente || !paciente) {
    return <EmptyState text={erroPaciente ?? 'Paciente não encontrado.'} />
  }

  return (
    <div>
      <PageHeader
        title={paciente.nome}
        subtitle={paciente.convenio ? `Convênio: ${paciente.convenio}` : 'Particular'}
        icon={UserCircle2}
        action={
          <Button variant="secondary" onClick={() => navigate('/administrativo/pacientes')}>
            ← Voltar
          </Button>
        }
      />

      <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
        {abasVisiveis.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              aba === a.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'dados' && (
        <div>
          <Card className="p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                {paciente.foto_url ? (
                  <img src={paciente.foto_url} alt="" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
                    <UserCircle2 className="h-8 w-8 text-slate-300" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-slate-800">{paciente.nome}</p>
                  <p className="text-sm text-slate-500">{paciente.cpf || 'CPF não informado'}</p>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2 shrink-0">
                <Button
                  variant="secondary"
                  onClick={() => id && pacientesApi.abrirEtiquetaPdf(id).catch(() => alert('Erro ao gerar a etiqueta.'))}
                >
                  <Printer className="h-3.5 w-3.5" /> Etiqueta
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => id && pacientesApi.abrirPulseiraPdf(id, 'papel').catch(() => alert('Erro ao gerar a pulseira.'))}
                >
                  <Printer className="h-3.5 w-3.5" /> Pulseira (papel)
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => id && pacientesApi.abrirPulseiraPdf(id, 'termica').catch(() => alert('Erro ao gerar a pulseira.'))}
                >
                  <Printer className="h-3.5 w-3.5" /> Pulseira (térmica)
                </Button>
                {podeGerenciarPacientes && (
                  <>
                    <Button variant="secondary" onClick={abrirEdicaoDados}>
                      Editar
                    </Button>
                    <Button variant="danger" onClick={removerPaciente}>
                      Remover
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400">Telefone</p>
                <p className="text-slate-700">{paciente.telefone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">E-mail</p>
                <p className="text-slate-700">{paciente.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Data de nascimento</p>
                <p className="text-slate-700">{paciente.data_nascimento ? formatarDataBr(paciente.data_nascimento) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Sexo</p>
                <p className="text-slate-700">{paciente.sexo ? ROTULOS_SEXO[paciente.sexo] : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Filiação (mãe)</p>
                <p className="text-slate-700">{paciente.nome_mae || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Peso/altura</p>
                <p className="text-slate-700">{pesoAltura ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Endereço</p>
                <p className="text-slate-700">
                  {paciente.logradouro ? `${paciente.logradouro}, ${paciente.numero ?? ''} — ${paciente.cidade ?? ''}/${paciente.estado ?? ''}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Indicado por</p>
                <p className="text-slate-700">{paciente.indicado_por || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Consentimento LGPD</p>
                <p className={paciente.consentimento_lgpd_em ? 'text-emerald-700' : 'text-amber-600'}>
                  {paciente.consentimento_lgpd_em
                    ? `Aceito em ${new Date(paciente.consentimento_lgpd_em).toLocaleString('pt-BR')}`
                    : 'Pendente'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {aba === 'prontuario' && podeVerProntuario && (
        <div>
          <div className="flex items-center justify-between mb-4 gap-2">
            <h2 className="font-semibold text-slate-800">Histórico clínico</h2>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="secondary"
                onClick={() => id && prontuariosApi.abrirHistoricoPdf(id).catch(() => alert('Erro ao gerar o histórico.'))}
              >
                Baixar histórico completo
              </Button>
              {agendamentoId && role === 'medico' && !atendimentoFinalizado && (
                <Button onClick={finalizarAtendimento} disabled={finalizandoAtendimento}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> {finalizandoAtendimento ? 'Finalizando...' : 'Finalizar evolução'}
                </Button>
              )}
              <Button onClick={() => setMostrarFormEvolucao((v) => !v)}>
                {mostrarFormEvolucao ? 'Fechar' : '+ Novo registro'}
              </Button>
            </div>
          </div>

          {agendamentoId && role === 'medico' && atendimentoFinalizado && (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">
              Atendimento finalizado. Voltando para a agenda...
            </p>
          )}

          {usuario?.clinica?.modulos_opcionais?.includes('fotos_pre_pos') && (
            <Card className="p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-800">Fotos (pré/pós-operatório)</h3>
                </div>
                <Button variant="secondary" onClick={abrirNovaFoto}>
                  + Adicionar foto
                </Button>
              </div>
              {fotos.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma foto registrada ainda.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {fotos.map((f) => (
                    <div key={f.id} className="relative group rounded-lg overflow-hidden border border-slate-200">
                      <img src={f.foto_url} alt="" className="w-full aspect-square object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-slate-900/70 px-2 py-1">
                        <Badge tone={f.tipo === 'pre_operatorio' ? 'amber' : 'green'}>{ROTULOS_TIPO_FOTO[f.tipo]}</Badge>
                        <p className="text-[10px] text-white mt-0.5">{formatarDataBr(f.data)}</p>
                      </div>
                      {!ehEnfermagem && (
                        <button
                          type="button"
                          onClick={() => removerFoto(f)}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {sessoesFisio.length > 0 && (
            <Card className="p-5 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-slate-500" />
                <h3 className="font-semibold text-slate-800">Sessões de fisioterapia</h3>
              </div>
              <div className="space-y-2">
                {sessoesFisio.map((s) => (
                  <div
                    key={s.id}
                    className="text-sm text-slate-600 flex items-start justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                  >
                    <span>
                      <span className="font-medium text-slate-700">
                        {formatarDataBr(s.data_hora.slice(0, 10))} às {s.data_hora.slice(11, 16)}
                      </span>
                      {s.observacoes && ` — ${s.observacoes}`}
                    </span>
                    <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">{s.usuario_nome}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {mostrarFormEvolucao && (
            <Card className="p-5 mb-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Médico responsável</Label>
                  <Select value={formEvolucao.medico_id} onChange={(e) => setFormEvolucao({ ...formEvolucao, medico_id: e.target.value })}>
                    <option value="">Selecione...</option>
                    {medicos.map((m) => (
                      <option key={m.id} value={m.id}>
                        Dr(a). {m.nome}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={formEvolucao.data} onChange={(e) => setFormEvolucao({ ...formEvolucao, data: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Queixa principal</Label>
                <Textarea rows={2} value={formEvolucao.queixa} onChange={(e) => setFormEvolucao({ ...formEvolucao, queixa: e.target.value })} />
              </div>
              {!ehEnfermagem && (
                <>
                  <div>
                    <Label>Diagnóstico</Label>
                    <Textarea
                      rows={2}
                      value={formEvolucao.diagnostico}
                      onChange={(e) => setFormEvolucao({ ...formEvolucao, diagnostico: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Prescrição</Label>
                    {modelosReceita.length > 0 && (
                      <div className="flex gap-2 mb-2">
                        <Select value={modeloParaInserir} onChange={(e) => setModeloParaInserir(e.target.value)} className="flex-1">
                          <option value="">Selecione um modelo de receita...</option>
                          {modelosReceita.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nome}
                            </option>
                          ))}
                        </Select>
                        <Button variant="secondary" onClick={inserirModeloNaPrescricao} disabled={!modeloParaInserir}>
                          + Inserir
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Ou digite um item de receita..."
                        value={itemPrescricaoLivre}
                        onChange={(e) => setItemPrescricaoLivre(e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="secondary" onClick={inserirItemLivreNaPrescricao} disabled={!itemPrescricaoLivre.trim()}>
                        + Inserir
                      </Button>
                    </div>
                    {itensPrescricao.length === 0 ? (
                      <p className="text-xs text-slate-400">Nenhum item inserido ainda — selecione um modelo ou digite um item acima.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {itensPrescricao.map((item, i) => (
                          <li
                            key={i}
                            className="flex items-start justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700"
                          >
                            <span className="whitespace-pre-wrap">{item}</span>
                            <button
                              type="button"
                              onClick={() => removerItemPrescricao(i)}
                              className="text-slate-400 hover:text-red-600 shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <Label>Pedido de exames</Label>
                    {modelosExame.length > 0 && (
                      <div className="flex gap-2 mb-2">
                        <Select value={modeloExameParaInserir} onChange={(e) => setModeloExameParaInserir(e.target.value)} className="flex-1">
                          <option value="">Selecione um modelo de exame...</option>
                          {modelosExame.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nome}
                            </option>
                          ))}
                        </Select>
                        <Button variant="secondary" onClick={inserirModeloExameNoPedido} disabled={!modeloExameParaInserir}>
                          + Inserir
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Ou digite um exame..."
                        value={itemExameLivre}
                        onChange={(e) => setItemExameLivre(e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="secondary" onClick={inserirItemExameLivre} disabled={!itemExameLivre.trim()}>
                        + Inserir
                      </Button>
                    </div>
                    {itensPedidoExames.length === 0 ? (
                      <p className="text-xs text-slate-400">Nenhum exame inserido ainda — selecione um modelo ou digite um exame acima.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {itensPedidoExames.map((item, i) => (
                          <li
                            key={i}
                            className="flex items-start justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700"
                          >
                            <span className="whitespace-pre-wrap">{item}</span>
                            <button
                              type="button"
                              onClick={() => removerItemExame(i)}
                              className="text-slate-400 hover:text-red-600 shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
              <div>
                <Label>Evolução{ehEnfermagem ? ' (obrigatório)' : ''}</Label>
                <Textarea rows={3} value={formEvolucao.evolucao} onChange={(e) => setFormEvolucao({ ...formEvolucao, evolucao: e.target.value })} />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  rows={2}
                  value={formEvolucao.observacoes}
                  onChange={(e) => setFormEvolucao({ ...formEvolucao, observacoes: e.target.value })}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={salvarEvolucao}
                  disabled={salvandoEvolucao || !formEvolucao.medico_id || !formEvolucao.data || (ehEnfermagem && !formEvolucao.evolucao)}
                >
                  {salvandoEvolucao ? 'Salvando...' : 'Salvar registro'}
                </Button>
              </div>
            </Card>
          )}

          {carregandoProntuario ? (
            <p className="text-sm text-slate-400">Carregando...</p>
          ) : registros.length === 0 ? (
            <EmptyState text="Nenhum registro no prontuário deste paciente ainda." />
          ) : (
            <div className="space-y-3">
              {registros.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-slate-800">{r.data}</p>
                    <p className="text-xs text-slate-400">Dr(a). {r.medico_nome}</p>
                  </div>
                  {r.queixa && (
                    <p className="text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Queixa: </span>
                      {r.queixa}
                    </p>
                  )}
                  {r.diagnostico && (
                    <p className="text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Diagnóstico: </span>
                      {r.diagnostico}
                    </p>
                  )}
                  {r.prescricao && (
                    <p className="text-sm text-slate-600 flex items-start justify-between gap-2">
                      <span>
                        <span className="font-medium text-slate-700">Prescrição: </span>
                        {r.prescricao}
                      </span>
                      <button
                        type="button"
                        onClick={() => prontuariosApi.abrirReceitaPdf(r.id).catch(() => alert('Erro ao gerar a receita.'))}
                        className="text-xs font-medium text-brand-700 hover:text-brand-800 whitespace-nowrap shrink-0"
                      >
                        Baixar receita
                      </button>
                    </p>
                  )}
                  {r.pedido_exames && (
                    <p className="text-sm text-slate-600 flex items-start justify-between gap-2">
                      <span>
                        <span className="font-medium text-slate-700 inline-flex items-center gap-1">
                          <FlaskConical className="h-3.5 w-3.5" /> Pedido de exames:
                        </span>{' '}
                        {r.pedido_exames}
                      </span>
                      <button
                        type="button"
                        onClick={() => prontuariosApi.abrirPedidoExamesPdf(r.id).catch(() => alert('Erro ao gerar o pedido de exames.'))}
                        className="text-xs font-medium text-brand-700 hover:text-brand-800 whitespace-nowrap shrink-0"
                      >
                        Baixar pedido
                      </button>
                    </p>
                  )}
                  {r.evolucao && (
                    <p className="text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Evolução: </span>
                      {r.evolucao}
                    </p>
                  )}
                  {r.observacoes && <p className="text-sm text-slate-500 italic mt-1">{r.observacoes}</p>}
                </Card>
              ))}
            </div>
          )}

          <Modal open={modalFotoAberto} onClose={() => setModalFotoAberto(false)} title="Adicionar foto ao histórico">
            <div className="space-y-3">
              <CapturaFoto formato="quadrado" onNovaFoto={setFotoBlobNova} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={formFoto.tipo} onChange={(e) => setFormFoto({ ...formFoto, tipo: e.target.value as TipoFotoPaciente })}>
                    <option value="pre_operatorio">Pré-operatório</option>
                    <option value="pos_operatorio">Pós-operatório</option>
                  </Select>
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={formFoto.data} onChange={(e) => setFormFoto({ ...formFoto, data: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Observações (opcional)</Label>
                <Textarea rows={2} value={formFoto.observacoes} onChange={(e) => setFormFoto({ ...formFoto, observacoes: e.target.value })} />
              </div>
              {erroFoto && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroFoto}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setModalFotoAberto(false)}>
                  Cancelar
                </Button>
                <Button onClick={salvarFoto} disabled={salvandoFoto || !fotoBlobNova || !formFoto.data}>
                  {salvandoFoto ? 'Salvando...' : 'Salvar foto'}
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {aba === 'financeiro' && podeVerFinanceiro && (
        <div className="space-y-6">
          {podeVerOrcamentos && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-800">Orçamentos</h2>
                <Button onClick={abrirNovoOrcamento}>+ Novo orçamento</Button>
              </div>
              {carregandoOrcamentos ? (
                <p className="text-sm text-slate-400">Carregando...</p>
              ) : orcamentos.length === 0 ? (
                <EmptyState text="Nenhum orçamento cadastrado ainda." />
              ) : (
                <div className="space-y-3">
                  {orcamentos.map((o) => (
                    <Card key={o.id} className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-800">{o.titulo}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {o.itens.map((it) => it.descricao).join(', ') || `${o.itens.length} item(ns)`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800">{moeda(o.valor_total)}</p>
                          <Select value={o.status} onChange={(e) => alterarStatusOrcamento(o, e.target.value as Orcamento['status'])} className="!w-auto">
                            <option value="pendente">Pendente</option>
                            <option value="aprovado">Aprovado</option>
                            <option value="recusado">Recusado</option>
                          </Select>
                          <Button variant="secondary" onClick={() => abrirEdicaoOrcamento(o)}>
                            Editar
                          </Button>
                          <Button variant="danger" onClick={() => removerOrcamento(o)}>
                            Remover
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {podeVerPagamentos && (
            <div className={podeVerOrcamentos ? 'border-t border-slate-100 pt-6' : ''}>
              <h2 className="font-semibold text-slate-800 mb-3">Pagamentos</h2>
              {carregandoPagamentos ? (
                <p className="text-sm text-slate-400">Carregando...</p>
              ) : pagamentos.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum pagamento registrado.</p>
              ) : (
                <div className="space-y-1.5">
                  {pagamentos.map((pg) => (
                    <div key={pg.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{pg.descricao}</p>
                        <p className="text-xs text-slate-400">{pg.data_vencimento ?? '—'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="text-sm font-semibold text-slate-800">{moeda(pg.valor)}</p>
                        <Badge tone={statusPagamentoTone(pg.status)}>{pg.status}</Badge>
                        {pg.comprovante_url ? (
                          <a href={pg.comprovante_url} target="_blank" rel="noreferrer" className="text-brand-700 hover:text-brand-800" title="Ver comprovante">
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

              <div className="mt-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notas fiscais</h3>
                {notasFiscais.length === 0 ? (
                  <p className="text-sm text-slate-400 mb-2">Nenhuma nota fiscal enviada.</p>
                ) : (
                  <div className="space-y-1.5 mb-3">
                    {notasFiscais.map((n) => (
                      <div key={n.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                        <a href={n.arquivo_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 min-w-0 text-brand-700 hover:text-brand-800">
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
                  <Input placeholder="Descrição (opcional)" value={descricaoNota} onChange={(e) => setDescricaoNota(e.target.value)} />
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
            </div>
          )}

          <Modal
            open={modalOrcamentoAberto}
            onClose={() => setModalOrcamentoAberto(false)}
            title={editandoOrcamentoId ? 'Editar orçamento' : 'Novo orçamento'}
          >
            <div className="space-y-3">
              <div>
                <Label>Título</Label>
                <Input value={formOrcamento.titulo} onChange={(e) => setFormOrcamento({ ...formOrcamento, titulo: e.target.value })} />
              </div>
              {modelosOrcamentoAtivos.length > 0 && (
                <div>
                  <Label>Usar modelo de orçamento (opcional)</Label>
                  <Select value="" onChange={(e) => aplicarModeloOrcamento(e.target.value)}>
                    <option value="">Selecione um modelo para preencher os itens...</option>
                    {modelosOrcamentoAtivos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome} — {moeda(m.itens.reduce((s, it) => s + it.valor, 0))}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <div>
                <Label>Itens (selecione do catálogo)</Label>
                {catalogoAtivo.length === 0 && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
                    Nenhum item cadastrado no catálogo ainda. Peça para admin/financeiro cadastrar em Financeiro → Orçamentos → Catálogo de itens.
                  </p>
                )}
                <div className="space-y-2">
                  {formOrcamento.itens.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Select value={item.item_id} onChange={(e) => atualizarItemOrcamento(i, 'item_id', e.target.value)}>
                        <option value="">Selecione um item...</option>
                        {catalogoAtivo.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome} — {moeda(c.valor)}
                          </option>
                        ))}
                      </Select>
                      <Input
                        type="number"
                        placeholder="Qtd"
                        className="w-20"
                        value={item.quantidade ?? 1}
                        onChange={(e) => atualizarItemOrcamento(i, 'quantidade', e.target.value)}
                      />
                      <p className="text-sm text-slate-600 w-24 text-right shrink-0">{moeda(valorItemOrcamento(item))}</p>
                      <button onClick={() => removerItemOrcamento(i)} className="text-slate-400 hover:text-red-600 shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="ghost" className="mt-1" onClick={adicionarItemOrcamento} disabled={catalogoAtivo.length === 0}>
                  + Adicionar item
                </Button>
                <p className="text-sm font-semibold text-slate-700 mt-1">Total: {moeda(totalFormOrcamento)}</p>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea rows={2} value={formOrcamento.observacoes ?? ''} onChange={(e) => setFormOrcamento({ ...formOrcamento, observacoes: e.target.value })} />
              </div>
              {erroOrcamento && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroOrcamento}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setModalOrcamentoAberto(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={salvarOrcamento}
                  disabled={salvandoOrcamento || !formOrcamento.titulo || formOrcamento.itens.filter((it) => it.item_id).length === 0}
                >
                  {salvandoOrcamento ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {aba === 'contratos' && podeVerContratos && (
        <div>
          {carregandoContratos ? (
            <p className="text-sm text-slate-400">Carregando...</p>
          ) : contratos.length === 0 ? (
            <p className="text-sm text-slate-400 mb-2">Nenhum contrato enviado.</p>
          ) : (
            <div className="space-y-1.5 mb-3">
              {contratos.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                  <a href={c.arquivo_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 min-w-0 text-brand-700 hover:text-brand-800">
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
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={gerarContratoPdf} disabled={gerandoContrato}>
                {gerandoContrato ? 'Gerando...' : 'Gerar contrato'}
              </Button>
              <Input placeholder="Descrição (opcional)" value={descricaoContrato} onChange={(e) => setDescricaoContrato(e.target.value)} />
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
          <p className="text-xs text-slate-400 mt-2">
            "Gerar contrato" monta o PDF com os dados deste paciente a partir do modelo cadastrado em Configurações. Depois de
            imprimir e assinar, anexe o PDF assinado com "+ PDF" acima.
          </p>
          {erroContrato && <p className="text-sm text-red-600 mt-2">{erroContrato}</p>}
        </div>
      )}

      {aba === 'cirurgias' && podeVerCirurgias && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Cirurgias</h2>
            <Button onClick={() => navigate('/cirurgias')}>+ Nova cirurgia</Button>
          </div>
          {carregandoCirurgias ? (
            <p className="text-sm text-slate-400">Carregando...</p>
          ) : cirurgias.length === 0 ? (
            <EmptyState text="Nenhuma cirurgia cadastrada para este paciente ainda." icon={Scissors} />
          ) : (
            <div className="space-y-3">
              {cirurgias.map((c) => (
                <Card key={c.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800">{c.nome_cirurgia}</p>
                        <Badge tone={c.status === 'pronta' ? 'green' : 'amber'}>
                          {c.status === 'pronta' ? 'Relatório pronto' : 'Em preenchimento'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {c.medico_nome ? `Dr(a). ${c.medico_nome}` : 'Sem médico definido'} · Data prevista: {formatarData(c.data_prevista)}
                        {c.hospital_nome ? ` · ${c.hospital_nome}` : ''}
                      </p>
                    </div>
                    {c.status === 'pronta' && (
                      <Button variant="secondary" onClick={() => baixarRelatorioCirurgia(c)}>
                        Baixar relatório
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {aba === 'auditoria' && podeVerAuditoria && (
        <div>
          <div className="mb-4">
            <h2 className="font-semibold text-slate-800">Auditoria do prontuário</h2>
            <p className="text-xs text-slate-400 mt-0.5">Quem acessou ou alterou o prontuário deste paciente, e quando.</p>
          </div>
          {carregandoAuditoria ? (
            <p className="text-sm text-slate-400">Carregando...</p>
          ) : auditoria.length === 0 ? (
            <EmptyState text="Nenhum acesso registrado ainda." icon={Shield} />
          ) : (
            <div className="space-y-2">
              {auditoria.map((a) => (
                <Card key={a.id} className="p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-slate-800">
                        <span className="font-medium">{a.usuario_nome ?? 'Usuário removido'}</span>
                        {a.usuario_role ? ` (${a.usuario_role})` : ''} — {ACAO_AUDITORIA_LABEL[a.acao] ?? a.acao}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">{formatarDataHora(a.created_at)}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {aba === 'documentos' && podeVerDocumentos && (
        <div className="space-y-6">
          {podeEmitirDocumentos && (
            <Card className="p-5 space-y-4">
              <div>
                <p className="font-medium text-slate-800">Emitir documento</p>
                <p className="text-xs text-slate-400">
                  Emita receita ou pedido de exames sem precisar registrar queixa/diagnóstico/evolução — útil quando é só para imprimir e
                  entregar ao paciente.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Médico responsável</Label>
                  <Select value={docMedicoId} onChange={(e) => setDocMedicoId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {medicos.map((m) => (
                      <option key={m.id} value={m.id}>
                        Dr(a). {m.nome}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={docData} onChange={(e) => setDocData(e.target.value)} />
                </div>
              </div>

              {erroDoc && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroDoc}</p>}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <FileText className="h-4 w-4" /> Receita
                  </p>
                  {modelosReceita.length > 0 && (
                    <div className="flex gap-2">
                      <Select value={docModeloReceita} onChange={(e) => setDocModeloReceita(e.target.value)} className="flex-1">
                        <option value="">Selecione um modelo...</option>
                        {modelosReceita.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome}
                          </option>
                        ))}
                      </Select>
                      <Button variant="secondary" onClick={inserirModeloReceitaNoDoc} disabled={!docModeloReceita}>
                        + Inserir
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ou digite um item..."
                      value={docItemReceitaLivre}
                      onChange={(e) => setDocItemReceitaLivre(e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="secondary" onClick={inserirItemReceitaLivreNoDoc} disabled={!docItemReceitaLivre.trim()}>
                      + Inserir
                    </Button>
                  </div>
                  {docItensReceita.length === 0 ? (
                    <p className="text-xs text-slate-400">Nenhum item inserido ainda.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {docItensReceita.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700"
                        >
                          <span className="whitespace-pre-wrap">{item}</span>
                          <button
                            type="button"
                            onClick={() => setDocItensReceita((itens) => itens.filter((_, idx) => idx !== i))}
                            className="text-slate-400 hover:text-red-600 shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex justify-end">
                    <Button
                      onClick={emitirReceitaDoc}
                      disabled={emitindoReceitaDoc || !docMedicoId || docItensReceita.length === 0}
                    >
                      {emitindoReceitaDoc ? 'Emitindo...' : 'Emitir receita'}
                    </Button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <FlaskConical className="h-4 w-4" /> Pedido de exames
                  </p>
                  {modelosExame.length > 0 && (
                    <div className="flex gap-2">
                      <Select value={docModeloExame} onChange={(e) => setDocModeloExame(e.target.value)} className="flex-1">
                        <option value="">Selecione um modelo...</option>
                        {modelosExame.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome}
                          </option>
                        ))}
                      </Select>
                      <Button variant="secondary" onClick={inserirModeloExameNoDoc} disabled={!docModeloExame}>
                        + Inserir
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ou digite um exame..."
                      value={docItemExameLivre}
                      onChange={(e) => setDocItemExameLivre(e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="secondary" onClick={inserirItemExameLivreNoDoc} disabled={!docItemExameLivre.trim()}>
                      + Inserir
                    </Button>
                  </div>
                  {docItensExame.length === 0 ? (
                    <p className="text-xs text-slate-400">Nenhum exame inserido ainda.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {docItensExame.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700"
                        >
                          <span className="whitespace-pre-wrap">{item}</span>
                          <button
                            type="button"
                            onClick={() => setDocItensExame((itens) => itens.filter((_, idx) => idx !== i))}
                            className="text-slate-400 hover:text-red-600 shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex justify-end">
                    <Button onClick={emitirExameDoc} disabled={emitindoExameDoc || !docMedicoId || docItensExame.length === 0}>
                      {emitindoExameDoc ? 'Emitindo...' : 'Emitir pedido de exames'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {carregandoDocs ? (
            <p className="text-sm text-slate-400">Carregando...</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">Receitas emitidas</p>
                {receitasDocs.length === 0 ? (
                  <EmptyState text="Nenhuma receita emitida ainda." icon={FileText} />
                ) : (
                  <div className="space-y-2">
                    {receitasDocs.map((r) => (
                      <Card key={r.id} className="p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{formatarData(r.data)}</p>
                          <p className="text-xs text-slate-400">Dr(a). {r.medico_nome}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => prontuariosApi.abrirReceitaPdf(r.id).catch(() => alert('Erro ao gerar a receita.'))}
                          className="flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-800 whitespace-nowrap"
                        >
                          <Printer className="h-3.5 w-3.5" /> Imprimir
                        </button>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">Pedidos de exames emitidos</p>
                {pedidosExameDocs.length === 0 ? (
                  <EmptyState text="Nenhum pedido de exames emitido ainda." icon={FlaskConical} />
                ) : (
                  <div className="space-y-2">
                    {pedidosExameDocs.map((p) => (
                      <Card key={p.id} className="p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{formatarData(p.data)}</p>
                          <p className="text-xs text-slate-400">Dr(a). {p.medico_nome}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => prontuariosApi.abrirPedidoExamesPdf(p.id).catch(() => alert('Erro ao gerar o pedido de exames.'))}
                          className="flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-800 whitespace-nowrap"
                        >
                          <Printer className="h-3.5 w-3.5" /> Imprimir
                        </button>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={modalDadosAberto} onClose={() => setModalDadosAberto(false)} title="Editar paciente">
        <div className="space-y-3">
          <CapturaFoto fotoAtualUrl={paciente.foto_url} onNovaFoto={setFotoBlob} />

          <div>
            <Label>Nome completo</Label>
            <Input value={formDados.nome} onChange={(e) => setFormDados({ ...formDados, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>CPF</Label>
              <Input value={formDados.cpf} onChange={(e) => setFormDados({ ...formDados, cpf: e.target.value })} />
            </div>
            <div>
              <Label>RG</Label>
              <Input value={formDados.rg} onChange={(e) => setFormDados({ ...formDados, rg: e.target.value })} />
            </div>
            <div>
              <Label>Data de nascimento</Label>
              <Input
                type="date"
                value={formDados.data_nascimento}
                onChange={(e) => setFormDados({ ...formDados, data_nascimento: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefone</Label>
              <Input value={formDados.telefone} onChange={(e) => setFormDados({ ...formDados, telefone: e.target.value })} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={formDados.email} onChange={(e) => setFormDados({ ...formDados, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Sexo</Label>
              <Select value={formDados.sexo} onChange={(e) => setFormDados({ ...formDados, sexo: e.target.value as Sexo })}>
                <option value="">Selecione...</option>
                {Object.entries(ROTULOS_SEXO).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Estado civil</Label>
              <Select value={formDados.estado_civil} onChange={(e) => setFormDados({ ...formDados, estado_civil: e.target.value as EstadoCivil })}>
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
              <Select value={formDados.cor_raca} onChange={(e) => setFormDados({ ...formDados, cor_raca: e.target.value as CorRaca })}>
                <option value="">Selecione...</option>
                {Object.entries(ROTULOS_COR_RACA).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Profissão</Label>
              <Input value={formDados.profissao} onChange={(e) => setFormDados({ ...formDados, profissao: e.target.value })} />
            </div>
            <div>
              <Label>Nome do responsável</Label>
              <Input value={formDados.nome_responsavel} onChange={(e) => setFormDados({ ...formDados, nome_responsavel: e.target.value })} />
            </div>
            <div>
              <Label>Nome da mãe</Label>
              <Input value={formDados.nome_mae} onChange={(e) => setFormDados({ ...formDados, nome_mae: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Peso (kg)</Label>
              <Input type="number" step="0.1" value={formDados.peso_kg} onChange={(e) => setFormDados({ ...formDados, peso_kg: e.target.value })} />
            </div>
            <div>
              <Label>Altura (cm)</Label>
              <Input type="number" value={formDados.altura_cm} onChange={(e) => setFormDados({ ...formDados, altura_cm: e.target.value })} />
            </div>
            <div>
              <Label>Primeira consulta</Label>
              <Input
                type="date"
                value={formDados.data_primeira_consulta}
                onChange={(e) => setFormDados({ ...formDados, data_primeira_consulta: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Indicado por</Label>
            <Input value={formDados.indicado_por} onChange={(e) => setFormDados({ ...formDados, indicado_por: e.target.value })} />
          </div>

          <SecaoTitulo>LGPD</SecaoTitulo>
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={formDados.consentimento_lgpd}
              onChange={(e) => setFormDados({ ...formDados, consentimento_lgpd: e.target.checked })}
            />
            <span>
              Paciente (ou responsável legal) autorizou o tratamento dos dados de saúde, conforme{' '}
              <a href="/termo-consentimento-paciente" target="_blank" rel="noreferrer" className="underline">
                termo de consentimento
              </a>
              . Desmarcar registra revogação.
            </span>
          </label>

          <SecaoTitulo>Endereço</SecaoTitulo>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CEP {buscandoCep && <span className="text-slate-400 normal-case">(buscando...)</span>}</Label>
              <Input value={formDados.cep} onChange={(e) => onCepChange(e.target.value)} placeholder="00000-000" />
            </div>
            <div>
              <Label>Logradouro</Label>
              <Input value={formDados.logradouro} onChange={(e) => setFormDados({ ...formDados, logradouro: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Número</Label>
              <Input value={formDados.numero} onChange={(e) => setFormDados({ ...formDados, numero: e.target.value })} />
            </div>
            <div>
              <Label>Complemento</Label>
              <Input value={formDados.complemento} onChange={(e) => setFormDados({ ...formDados, complemento: e.target.value })} />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input value={formDados.bairro} onChange={(e) => setFormDados({ ...formDados, bairro: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cidade</Label>
              <Input value={formDados.cidade} onChange={(e) => setFormDados({ ...formDados, cidade: e.target.value })} />
            </div>
            <div>
              <Label>Estado (UF)</Label>
              <Input maxLength={2} value={formDados.estado} onChange={(e) => setFormDados({ ...formDados, estado: e.target.value.toUpperCase() })} />
            </div>
          </div>

          <SecaoTitulo>Convênio</SecaoTitulo>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Convênio (deixe em branco se particular)</Label>
              <Input value={formDados.convenio} onChange={(e) => setFormDados({ ...formDados, convenio: e.target.value })} />
            </div>
            <div>
              <Label>Plano</Label>
              <Input value={formDados.plano} onChange={(e) => setFormDados({ ...formDados, plano: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Validade da carteirinha</Label>
              <Input
                type="date"
                value={formDados.validade_carteira}
                onChange={(e) => setFormDados({ ...formDados, validade_carteira: e.target.value })}
              />
            </div>
            <div>
              <Label>Cartão CNS</Label>
              <Input value={formDados.cartao_cns} onChange={(e) => setFormDados({ ...formDados, cartao_cns: e.target.value })} />
            </div>
          </div>

          {erroDados && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroDados}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalDadosAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarDados} disabled={salvandoDados || !formDados.nome}>
              {salvandoDados ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
