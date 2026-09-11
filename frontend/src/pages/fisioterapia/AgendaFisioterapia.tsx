import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, Card, EmptyState, Input, Label, Modal, PageHeader } from '../../components/ui'
import { SeletorPaciente } from '../../components/SeletorPaciente'
import { sessoesFisioterapiaApi } from '../../api/sessoesFisioterapia'
import { pacientesApi } from '../../api/pacientes'
import { ApiError } from '../../api/client'
import type { Paciente, SessaoFisioterapia } from '../../types'

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

interface FormSessao {
  paciente_id: string
  data_hora: string
  observacoes: string
}

const vazio: FormSessao = { paciente_id: '', data_hora: '', observacoes: '' }

export default function AgendaFisioterapia() {
  const [anoMes, setAnoMes] = useState(() => hoje().slice(0, 7))
  const [dataSelecionada, setDataSelecionada] = useState(hoje())
  const [sessoesMes, setSessoesMes] = useState<SessaoFisioterapia[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<FormSessao>(vazio)
  const [editando, setEditando] = useState<SessaoFisioterapia | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  function carregarMes(mes: string) {
    setCarregando(true)
    sessoesFisioterapiaApi
      .listar({ mes })
      .then(setSessoesMes)
      .catch(() => setErro('Não foi possível carregar a agenda. Verifique se o backend está rodando.'))
      .finally(() => setCarregando(false))
  }

  useEffect(() => carregarMes(anoMes), [anoMes])

  useEffect(() => {
    pacientesApi.listar().then(setPacientes).catch(() => {})
  }, [])

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
    setEditando(null)
    setForm({ ...vazio, data_hora: `${dataSelecionada}T09:00` })
    setErroForm(null)
    setModalAberto(true)
  }

  function abrirEdicao(s: SessaoFisioterapia) {
    setEditando(s)
    setForm({ paciente_id: s.paciente_id, data_hora: s.data_hora, observacoes: s.observacoes ?? '' })
    setErroForm(null)
    setModalAberto(true)
  }

  async function salvar() {
    setSalvando(true)
    setErroForm(null)
    try {
      if (editando) {
        await sessoesFisioterapiaApi.atualizar(editando.id, form)
      } else {
        await sessoesFisioterapiaApi.criar(form)
      }
      setModalAberto(false)
      setEditando(null)
      apontarPara(form.data_hora)
    } catch (err) {
      setErroForm(err instanceof ApiError ? err.message : 'Erro ao salvar sessão.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(s: SessaoFisioterapia) {
    if (!confirm(`Remover a sessão com ${s.paciente_nome}?`)) return
    await sessoesFisioterapiaApi.remover(s.id)
    carregarMes(anoMes)
  }

  const podeSalvar = useMemo(() => form.paciente_id && form.data_hora, [form])

  const sessoesPorDia = useMemo(() => {
    const mapa = new Map<string, SessaoFisioterapia[]>()
    for (const s of sessoesMes) {
      const dia = s.data_hora.slice(0, 10)
      const lista = mapa.get(dia) ?? []
      lista.push(s)
      mapa.set(dia, lista)
    }
    for (const lista of mapa.values()) lista.sort((a, b) => a.data_hora.localeCompare(b.data_hora))
    return mapa
  }, [sessoesMes])

  const sessoesDoDia = sessoesPorDia.get(dataSelecionada) ?? []

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
        title="Minha agenda"
        subtitle="Suas sessões de fisioterapia marcadas por paciente"
        icon={CalendarDays}
        action={<Button onClick={abrirNovo}>+ Nova sessão</Button>}
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
            const sessoesDia = sessoesPorDia.get(dia) ?? []
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
                {sessoesDia.length > 0 && (
                  <span className={`h-1.5 w-1.5 rounded-full mt-1 ${selecionado ? 'bg-white' : 'bg-blue-500'}`} />
                )}
                {sessoesDia.length > 0 && (
                  <span className={`hidden sm:block text-[10px] mt-auto ${selecionado ? 'text-white/80' : 'text-slate-400'}`}>
                    {sessoesDia.length} {sessoesDia.length === 1 ? 'sessão' : 'sessões'}
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
      ) : sessoesDoDia.length === 0 ? (
        <EmptyState text="Nada marcado para este dia." />
      ) : (
        <div className="space-y-3">
          {sessoesDoDia.map((s) => (
            <Card key={s.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-800">
                  {s.data_hora.slice(11, 16)} · {s.paciente_nome}
                </p>
                {s.observacoes && <p className="text-xs text-slate-400 mt-1">{s.observacoes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => abrirEdicao(s)}>
                  Editar
                </Button>
                <Button variant="danger" onClick={() => remover(s)}>
                  Remover
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editando ? 'Editar sessão' : 'Nova sessão'}>
        <div className="space-y-3">
          <div>
            <Label>Paciente</Label>
            <SeletorPaciente pacientes={pacientes} value={form.paciente_id} onChange={(id) => setForm({ ...form, paciente_id: id })} />
          </div>
          <div>
            <Label>Data e hora</Label>
            <Input
              type="datetime-local"
              value={form.data_hora}
              onChange={(e) => setForm({ ...form, data_hora: e.target.value })}
            />
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
              {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Marcar sessão'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
