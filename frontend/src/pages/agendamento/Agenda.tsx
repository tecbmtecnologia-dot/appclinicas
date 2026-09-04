import { useEffect, useMemo, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Select } from '../../components/ui'
import { agendamentosApi } from '../../api/agendamentos'
import { pacientesApi } from '../../api/pacientes'
import { medicosApi } from '../../api/medicos'
import type { Agendamento, Medico, Paciente, StatusAgendamento, TipoAtendimento } from '../../types'

function hoje() {
  return new Date().toISOString().slice(0, 10)
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
  data_hora: string
  tipo: TipoAtendimento
  observacoes: string
}

const vazio: FormAgendamento = { paciente_id: '', medico_id: '', data_hora: '', tipo: 'presencial', observacoes: '' }

export default function Agenda() {
  const [data, setData] = useState(hoje())
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<FormAgendamento>(vazio)
  const [salvando, setSalvando] = useState(false)

  function carregar() {
    setCarregando(true)
    agendamentosApi
      .listar({ data })
      .then(setAgendamentos)
      .catch(() => setErro('Não foi possível carregar a agenda. Verifique se o backend está rodando.'))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [data])

  useEffect(() => {
    pacientesApi.listar().then(setPacientes).catch(() => {})
    medicosApi.listar().then(setMedicos).catch(() => {})
  }, [])

  function abrirNovo() {
    setForm({ ...vazio, data_hora: `${data}T09:00` })
    setModalAberto(true)
  }

  async function salvar() {
    setSalvando(true)
    try {
      await agendamentosApi.criar({ ...form, status: 'agendado' })
      setModalAberto(false)
      carregar()
    } catch {
      alert('Erro ao criar agendamento. Confirme que paciente e médico foram selecionados.')
    } finally {
      setSalvando(false)
    }
  }

  async function cancelar(a: Agendamento) {
    if (!confirm('Cancelar esta consulta?')) return
    await agendamentosApi.cancelar(a.id)
    carregar()
  }

  async function marcarConcluido(a: Agendamento) {
    await agendamentosApi.atualizar(a.id, { status: 'concluido' })
    carregar()
  }

  const podeSalvar = useMemo(() => form.paciente_id && form.medico_id && form.data_hora, [form])

  return (
    <div>
      <PageHeader
        title="Agendamento"
        subtitle="Consultas presenciais e de telemedicina"
        icon={CalendarDays}
        action={<Button onClick={abrirNovo}>+ Nova consulta</Button>}
      />

      {erro && <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">{erro}</div>}

      <div className="mb-4 max-w-xs">
        <Label>Data</Label>
        <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : agendamentos.length === 0 ? (
        <EmptyState text="Nenhuma consulta agendada para este dia." />
      ) : (
        <div className="space-y-3">
          {agendamentos.map((a) => (
            <Card key={a.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-800">
                  {a.data_hora.slice(11, 16)} · {a.paciente_nome}
                </p>
                <p className="text-sm text-slate-500">
                  Dr(a). {a.medico_nome} · {a.tipo === 'telemedicina' ? 'Telemedicina' : 'Presencial'}
                </p>
                {a.observacoes && <p className="text-xs text-slate-400 mt-1">{a.observacoes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={statusTom[a.status]}>{a.status}</Badge>
                {a.status !== 'cancelado' && a.status !== 'concluido' && (
                  <>
                    <Button variant="secondary" onClick={() => marcarConcluido(a)}>
                      Concluir
                    </Button>
                    <Button variant="danger" onClick={() => cancelar(a)}>
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title="Nova consulta">
        <div className="space-y-3">
          <div>
            <Label>Paciente</Label>
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={!podeSalvar || salvando}>
              {salvando ? 'Salvando...' : 'Agendar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
