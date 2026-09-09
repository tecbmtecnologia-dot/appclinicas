import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, CalendarDays, ChevronLeft, ChevronRight, Stethoscope } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Select } from '../../components/ui'
import { agendamentosApi } from '../../api/agendamentos'
import { compromissosApi } from '../../api/compromissos'
import { pacientesApi } from '../../api/pacientes'
import { medicosApi } from '../../api/medicos'
import { tiposProcedimentoApi } from '../../api/tiposProcedimento'
import { useAuth } from '../../contexts/AuthContext'
import { ApiError } from '../../api/client'
import type { Agendamento, Compromisso, Medico, Paciente, StatusAgendamento, TipoAtendimento, TipoProcedimento } from '../../types'

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function formatarMesAno(mes: string) {
  const [ano, m] = mes.split('-')
  return `${NOMES_MES[Number(m) - 1]} de ${ano}`
}

function formatarDataExtenso(data: string) {
  const [ano, mes, dia] = data.split('-').map(Number)
  const d = new Date(ano, mes - 1, dia)
  const texto = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function somarMes(mes: string, delta: number) {
  const [ano, m] = mes.split('-').map(Number)
  const d = new Date(ano, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const statusTom: Record<StatusAgendamento, 'slate' | 'green' | 'red' | 'amber' | 'blue'> = {
  agendado: 'blue',
  confirmado: 'green',
  cancelado: 'red',
  concluido: 'slate',
}

interface FormAgendamento {
  paciente_id: string
  medico_id: string
  tipo_procedimento_id: string
  data_hora: string
  tipo: TipoAtendimento
  observacoes: string
}

interface FormCompromisso {
  medico_id: string
  titulo: string
  data_hora: string
  observacoes: string
}

const vazio: FormAgendamento = { paciente_id: '', medico_id: '', tipo_procedimento_id: '', data_hora: '', tipo: 'presencial', observacoes: '' }
const vazioCompromisso: FormCompromisso = { medico_id: '', titulo: '', data_hora: '', observacoes: '' }
const vazioPaciente = { nome: '', telefone: '', data_nascimento: '' }

type ItemAgenda = { tipo: 'consulta'; horario: string; agendamento: Agendamento } | { tipo: 'compromisso'; horario: string; compromisso: Compromisso }

export default function Agenda() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const ehMedico = usuario?.role === 'medico'
  const meuMedicoId = usuario?.medico_id ?? undefined

  const [anoMes, setAnoMes] = useState(() => hoje().slice(0, 7))
  const [dataSelecionada, setDataSelecionada] = useState(hoje())
  const [agendamentosMes, setAgendamentosMes] = useState<Agendamento[]>([])
  const [compromissosMes, setCompromissosMes] = useState<Compromisso[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [tiposProcedimento, setTiposProcedimento] = useState<TipoProcedimento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<FormAgendamento>(vazio)
  const [editandoAgendamento, setEditandoAgendamento] = useState<Agendamento | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [modalPacienteAberto, setModalPacienteAberto] = useState(false)
  const [formPaciente, setFormPaciente] = useState(vazioPaciente)
  const [salvandoPaciente, setSalvandoPaciente] = useState(false)
  const [erroPaciente, setErroPaciente] = useState<string | null>(null)
  const [modalCompromissoAberto, setModalCompromissoAberto] = useState(false)
  const [formCompromisso, setFormCompromisso] = useState<FormCompromisso>(vazioCompromisso)
  const [salvandoCompromisso, setSalvandoCompromisso] = useState(false)
  const [erroCompromisso, setErroCompromisso] = useState<string | null>(null)

  function carregarMes(mes: string) {
    setCarregando(true)
    Promise.all([
      agendamentosApi.listar({ mes, medico_id: meuMedicoId }),
      compromissosApi.listar({ mes, medico_id: meuMedicoId }),
    ])
      .then(([a, c]) => {
        setAgendamentosMes(a)
        setCompromissosMes(c)
      })
      .catch(() => setErro('Não foi possível carregar a agenda. Verifique se o backend está rodando.'))
      .finally(() => setCarregando(false))
  }

  useEffect(() => carregarMes(anoMes), [anoMes])

  useEffect(() => {
    pacientesApi.listar().then(setPacientes).catch(() => {})
    medicosApi.listar().then(setMedicos).catch(() => {})
    tiposProcedimentoApi.listar().then(setTiposProcedimento).catch(() => {})
  }, [])

  // Depois de criar/cancelar/concluir algo, recarrega o mês em exibição — se o item
  // criado caiu num mês diferente do exibido, troca o mês (o useEffect acima já recarrega).
  function apontarPara(dataHora: string) {
    const dia = dataHora.slice(0, 10)
    const mesDoItem = dia.slice(0, 7)
    setDataSelecionada(dia)
    if (mesDoItem !== anoMes) {
      setAnoMes(mesDoItem)
    } else {
      carregarMes(anoMes)
    }
  }

  function abrirNovo() {
    setEditandoAgendamento(null)
    setForm({ ...vazio, medico_id: meuMedicoId ?? '', data_hora: `${dataSelecionada}T09:00` })
    setErroForm(null)
    setModalAberto(true)
  }

  function abrirEdicaoAgendamento(a: Agendamento) {
    setEditandoAgendamento(a)
    setForm({
      paciente_id: a.paciente_id,
      medico_id: a.medico_id,
      tipo_procedimento_id: a.tipo_procedimento_id ?? '',
      data_hora: a.data_hora,
      tipo: a.tipo,
      observacoes: a.observacoes ?? '',
    })
    setErroForm(null)
    setModalAberto(true)
  }

  async function salvar() {
    setSalvando(true)
    setErroForm(null)
    try {
      if (editandoAgendamento) {
        await agendamentosApi.atualizar(editandoAgendamento.id, form)
      } else {
        await agendamentosApi.criar({ ...form, status: 'agendado' })
      }
      setModalAberto(false)
      setEditandoAgendamento(null)
      apontarPara(form.data_hora)
    } catch (err) {
      setErroForm(err instanceof ApiError ? err.message : 'Erro ao salvar agendamento.')
    } finally {
      setSalvando(false)
    }
  }

  function abrirNovoPaciente() {
    setFormPaciente(vazioPaciente)
    setErroPaciente(null)
    setModalPacienteAberto(true)
  }

  async function salvarPaciente() {
    if (!formPaciente.nome.trim()) return
    setSalvandoPaciente(true)
    setErroPaciente(null)
    try {
      const novo = await pacientesApi.criar({
        nome: formPaciente.nome,
        telefone: formPaciente.telefone,
        cpf: '',
        data_nascimento: formPaciente.data_nascimento,
        email: '',
        convenio: '',
        endereco: '',
      })
      setPacientes((atuais) => [...atuais, novo])
      setForm((f) => ({ ...f, paciente_id: novo.id }))
      setModalPacienteAberto(false)
    } catch {
      setErroPaciente('Erro ao cadastrar paciente.')
    } finally {
      setSalvandoPaciente(false)
    }
  }

  function abrirNovoCompromisso() {
    setFormCompromisso({ ...vazioCompromisso, medico_id: meuMedicoId ?? '', data_hora: `${dataSelecionada}T09:00` })
    setErroCompromisso(null)
    setModalCompromissoAberto(true)
  }

  async function salvarCompromisso() {
    setSalvandoCompromisso(true)
    setErroCompromisso(null)
    try {
      await compromissosApi.criar(formCompromisso)
      setModalCompromissoAberto(false)
      apontarPara(formCompromisso.data_hora)
    } catch (err) {
      setErroCompromisso(err instanceof ApiError ? err.message : 'Erro ao criar compromisso.')
    } finally {
      setSalvandoCompromisso(false)
    }
  }

  async function removerCompromisso(c: Compromisso) {
    if (!confirm(`Remover o compromisso "${c.titulo}"?`)) return
    await compromissosApi.remover(c.id)
    carregarMes(anoMes)
  }

  async function cancelar(a: Agendamento) {
    if (!confirm('Cancelar esta consulta?')) return
    await agendamentosApi.cancelar(a.id)
    carregarMes(anoMes)
  }

  async function marcarConcluido(a: Agendamento) {
    await agendamentosApi.atualizar(a.id, { status: 'concluido' })
    carregarMes(anoMes)
  }

  function atender(a: Agendamento) {
    navigate(`/prontuario?paciente=${a.paciente_id}`)
  }

  const podeSalvar = useMemo(
    () => form.paciente_id && form.medico_id && form.tipo_procedimento_id && form.data_hora,
    [form],
  )
  const podeSalvarCompromisso = useMemo(
    () => formCompromisso.medico_id && formCompromisso.titulo.trim() && formCompromisso.data_hora,
    [formCompromisso],
  )

  const itensPorDia = useMemo(() => {
    const mapa = new Map<string, ItemAgenda[]>()
    for (const a of agendamentosMes) {
      const dia = a.data_hora.slice(0, 10)
      const lista = mapa.get(dia) ?? []
      lista.push({ tipo: 'consulta', horario: a.data_hora, agendamento: a })
      mapa.set(dia, lista)
    }
    for (const c of compromissosMes) {
      const dia = c.data_hora.slice(0, 10)
      const lista = mapa.get(dia) ?? []
      lista.push({ tipo: 'compromisso', horario: c.data_hora, compromisso: c })
      mapa.set(dia, lista)
    }
    for (const lista of mapa.values()) lista.sort((x, y) => x.horario.localeCompare(y.horario))
    return mapa
  }, [agendamentosMes, compromissosMes])

  const itensDoDia = itensPorDia.get(dataSelecionada) ?? []

  const celulas = useMemo(() => {
    const [anoStr, mesStr] = anoMes.split('-')
    const ano = Number(anoStr)
    const mesIdx = Number(mesStr) - 1
    const primeiroDia = new Date(ano, mesIdx, 1)
    const totalDias = new Date(ano, mesIdx + 1, 0).getDate()
    const offset = primeiroDia.getDay()
    const lista: (string | null)[] = []
    for (let i = 0; i < offset; i++) lista.push(null)
    for (let d = 1; d <= totalDias; d++) lista.push(`${anoStr}-${mesStr}-${String(d).padStart(2, '0')}`)
    return lista
  }, [anoMes])

  return (
    <div>
      <PageHeader
        title={ehMedico ? 'Minha agenda' : 'Agendamento'}
        subtitle={ehMedico ? 'Suas consultas e compromissos do dia' : 'Consultas presenciais, telemedicina e compromissos'}
        icon={CalendarDays}
        action={
          ehMedico ? undefined : (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={abrirNovoCompromisso}>
                + Compromisso
              </Button>
              <Button onClick={abrirNovo}>+ Novo agendamento</Button>
            </div>
          )
        }
      />

      {erro && <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">{erro}</div>}

      <Card className="p-4 sm:p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">{formatarMesAno(anoMes)}</h2>
          <div className="flex items-center gap-1.5">
            <Button variant="secondary" className="!px-2.5" onClick={() => setAnoMes((m) => somarMes(m, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="secondary" onClick={() => { setAnoMes(hoje().slice(0, 7)); setDataSelecionada(hoje()) }}>
              Hoje
            </Button>
            <Button variant="secondary" className="!px-2.5" onClick={() => setAnoMes((m) => somarMes(m, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wide py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {celulas.map((dia, i) => {
            if (!dia) return <div key={`vazio-${i}`} />
            const itensDia = itensPorDia.get(dia) ?? []
            const temConsulta = itensDia.some((it) => it.tipo === 'consulta')
            const temCompromisso = itensDia.some((it) => it.tipo === 'compromisso')
            const selecionado = dia === dataSelecionada
            const ehHoje = dia === hoje()
            return (
              <button
                key={dia}
                type="button"
                onClick={() => setDataSelecionada(dia)}
                className={`min-h-[56px] sm:min-h-[76px] rounded-xl border p-1.5 flex flex-col items-center sm:items-start text-left transition-colors ${
                  selecionado
                    ? 'bg-brand-700 border-brand-700 text-white'
                    : ehHoje
                      ? 'bg-brand-50 border-brand-200 text-slate-800 hover:bg-brand-100'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className={`text-xs sm:text-sm font-semibold ${selecionado ? 'text-white' : ehHoje ? 'text-brand-700' : 'text-slate-700'}`}>
                  {Number(dia.slice(8, 10))}
                </span>
                {(temConsulta || temCompromisso) && (
                  <div className="flex gap-0.5 mt-1">
                    {temConsulta && (
                      <span className={`h-1.5 w-1.5 rounded-full ${selecionado ? 'bg-white' : 'bg-blue-500'}`} />
                    )}
                    {temCompromisso && (
                      <span className={`h-1.5 w-1.5 rounded-full ${selecionado ? 'bg-white/70' : 'bg-slate-400'}`} />
                    )}
                  </div>
                )}
                {itensDia.length > 0 && (
                  <span className={`hidden sm:block text-[10px] mt-auto ${selecionado ? 'text-white/80' : 'text-slate-400'}`}>
                    {itensDia.length} {itensDia.length === 1 ? 'item' : 'itens'}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </Card>

      <h3 className="text-sm font-bold text-slate-800 mb-3">{formatarDataExtenso(dataSelecionada)}</h3>

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : itensDoDia.length === 0 ? (
        <EmptyState text="Nada marcado para este dia." />
      ) : (
        <div className="space-y-3">
          {itensDoDia.map((item) =>
            item.tipo === 'consulta' ? (
              <Card key={item.agendamento.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800">
                    {item.agendamento.data_hora.slice(11, 16)} · {item.agendamento.paciente_nome}
                  </p>
                  <p className="text-sm text-slate-500">
                    Dr(a). {item.agendamento.medico_nome} ·{' '}
                    {item.agendamento.tipo === 'telemedicina' ? 'Telemedicina' : 'Presencial'}
                    {item.agendamento.tipo_procedimento_nome && ` · ${item.agendamento.tipo_procedimento_nome}`}
                  </p>
                  {item.agendamento.observacoes && (
                    <p className="text-xs text-slate-400 mt-1">{item.agendamento.observacoes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={statusTom[item.agendamento.status]}>{item.agendamento.status}</Badge>
                  {item.agendamento.status !== 'cancelado' && item.agendamento.status !== 'concluido' && (
                    <>
                      {ehMedico && (
                        <Button variant="secondary" onClick={() => atender(item.agendamento)}>
                          <Stethoscope className="h-3.5 w-3.5" /> Atender
                        </Button>
                      )}
                      {!ehMedico && (
                        <Button variant="secondary" onClick={() => abrirEdicaoAgendamento(item.agendamento)}>
                          Editar
                        </Button>
                      )}
                      <Button variant="secondary" onClick={() => marcarConcluido(item.agendamento)}>
                        Concluir
                      </Button>
                      <Button variant="danger" onClick={() => cancelar(item.agendamento)}>
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ) : (
              <Card key={item.compromisso.id} className="p-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
                <div>
                  <p className="font-medium text-slate-800 flex items-center gap-1.5">
                    <CalendarClock className="h-4 w-4 text-slate-400" />
                    {item.compromisso.data_hora.slice(11, 16)} · {item.compromisso.titulo}
                  </p>
                  <p className="text-sm text-slate-500">Dr(a). {item.compromisso.medico_nome}</p>
                  {item.compromisso.observacoes && (
                    <p className="text-xs text-slate-400 mt-1">{item.compromisso.observacoes}</p>
                  )}
                </div>
                {!ehMedico && (
                  <Button variant="danger" onClick={() => removerCompromisso(item.compromisso)}>
                    Remover
                  </Button>
                )}
              </Card>
            ),
          )}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editandoAgendamento ? 'Editar agendamento' : 'Novo agendamento'}>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <Label>Paciente</Label>
              <button type="button" onClick={abrirNovoPaciente} className="text-xs font-medium text-brand-700 hover:text-brand-800">
                + Novo paciente
              </button>
            </div>
            <Select value={form.paciente_id} onChange={(e) => setForm({ ...form, paciente_id: e.target.value })}>
              <option value="">Selecione...</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
            {pacientes.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">Cadastre um paciente antes de agendar.</p>
            )}
          </div>
          <div>
            <Label>Médico</Label>
            <Select value={form.medico_id} onChange={(e) => setForm({ ...form, medico_id: e.target.value })}>
              <option value="">Selecione...</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  Dr(a). {m.nome} — {m.especialidade}
                </option>
              ))}
            </Select>
            {medicos.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">Cadastre um médico antes de agendar.</p>
            )}
          </div>
          <div>
            <Label>Tipo de procedimento</Label>
            <Select
              value={form.tipo_procedimento_id}
              onChange={(e) => setForm({ ...form, tipo_procedimento_id: e.target.value })}
            >
              <option value="">Selecione...</option>
              {tiposProcedimento.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Select>
            {tiposProcedimento.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Nenhum tipo cadastrado — peça pro admin cadastrar em Configurações → Tipos de procedimento.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data e hora</Label>
              <Input
                type="datetime-local"
                value={form.data_hora}
                onChange={(e) => setForm({ ...form, data_hora: e.target.value })}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as 'presencial' | 'telemedicina' })}>
                <option value="presencial">Presencial</option>
                <option value="telemedicina">Telemedicina</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
          {erroForm && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroForm}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={!podeSalvar || salvando}>
              {salvando ? 'Salvando...' : editandoAgendamento ? 'Salvar alterações' : 'Agendar'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={modalPacienteAberto} onClose={() => setModalPacienteAberto(false)} title="Novo paciente">
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Cadastro rápido — só o essencial pra agendar. Complete os outros dados depois em Pacientes.
          </p>
          <div>
            <Label>Nome</Label>
            <Input
              autoFocus
              value={formPaciente.nome}
              onChange={(e) => setFormPaciente({ ...formPaciente, nome: e.target.value })}
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              value={formPaciente.telefone}
              onChange={(e) => setFormPaciente({ ...formPaciente, telefone: e.target.value })}
            />
          </div>
          <div>
            <Label>Data de nascimento</Label>
            <Input
              type="date"
              value={formPaciente.data_nascimento}
              onChange={(e) => setFormPaciente({ ...formPaciente, data_nascimento: e.target.value })}
            />
          </div>
          {erroPaciente && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroPaciente}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalPacienteAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarPaciente} disabled={!formPaciente.nome.trim() || salvandoPaciente}>
              {salvandoPaciente ? 'Salvando...' : 'Cadastrar e usar'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={modalCompromissoAberto} onClose={() => setModalCompromissoAberto(false)} title="Novo compromisso">
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Pra bloquear a agenda do médico com algo sem paciente — reunião, cirurgia externa, plantão etc.
          </p>
          <div>
            <Label>Médico</Label>
            <Select
              value={formCompromisso.medico_id}
              onChange={(e) => setFormCompromisso({ ...formCompromisso, medico_id: e.target.value })}
            >
              <option value="">Selecione...</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  Dr(a). {m.nome} — {m.especialidade}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Título</Label>
            <Input
              value={formCompromisso.titulo}
              onChange={(e) => setFormCompromisso({ ...formCompromisso, titulo: e.target.value })}
              placeholder="Ex: Reunião, cirurgia externa..."
            />
          </div>
          <div>
            <Label>Data e hora</Label>
            <Input
              type="datetime-local"
              value={formCompromisso.data_hora}
              onChange={(e) => setFormCompromisso({ ...formCompromisso, data_hora: e.target.value })}
            />
          </div>
          <div>
            <Label>Observações</Label>
            <Input
              value={formCompromisso.observacoes}
              onChange={(e) => setFormCompromisso({ ...formCompromisso, observacoes: e.target.value })}
            />
          </div>
          {erroCompromisso && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroCompromisso}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalCompromissoAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarCompromisso} disabled={!podeSalvarCompromisso || salvandoCompromisso}>
              {salvandoCompromisso ? 'Salvando...' : 'Marcar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
