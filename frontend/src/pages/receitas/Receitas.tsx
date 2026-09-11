import { useEffect, useState } from 'react'
import { Plus, Printer } from 'lucide-react'
import { Button, Card, EmptyState, Input, Label, PageHeader, Select, Textarea } from '../../components/ui'
import { SeletorPaciente } from '../../components/SeletorPaciente'
import { pacientesApi } from '../../api/pacientes'
import { prontuariosApi } from '../../api/prontuarios'
import { medicosApi } from '../../api/medicos'
import { useAuth } from '../../contexts/AuthContext'
import type { Medico, Paciente, ReceitaResumo } from '../../types'

function formatarDataBr(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-BR')
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10)
}

const PODE_EMITIR = ['admin', 'coordenador', 'recepcao']

export default function Receitas() {
  const { usuario } = useAuth()
  const podeEmitir = Boolean(usuario && PODE_EMITIR.includes(usuario.role))

  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [pacienteId, setPacienteId] = useState('')
  const [receitas, setReceitas] = useState<ReceitaResumo[]>([])
  const [carregando, setCarregando] = useState(false)

  const [medicos, setMedicos] = useState<Medico[]>([])
  const [medicoId, setMedicoId] = useState('')
  const [dataReceita, setDataReceita] = useState(hojeIso())
  const [prescricao, setPrescricao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    pacientesApi.listar().then(setPacientes).catch(() => {})
    if (podeEmitir) medicosApi.listar().then(setMedicos).catch(() => {})
  }, [podeEmitir])

  function recarregarReceitas(id: string) {
    setCarregando(true)
    prontuariosApi
      .listarReceitasPorPaciente(id)
      .then(setReceitas)
      .finally(() => setCarregando(false))
  }

  useEffect(() => {
    if (!pacienteId) {
      setReceitas([])
      return
    }
    recarregarReceitas(pacienteId)
  }, [pacienteId])

  async function emitirReceita() {
    if (!medicoId || !prescricao.trim()) {
      setErro('Selecione o médico responsável e descreva a prescrição.')
      return
    }
    setErro('')
    setSalvando(true)
    try {
      const criada = await prontuariosApi.criar({
        paciente_id: pacienteId,
        medico_id: medicoId,
        data: dataReceita,
        queixa: '',
        diagnostico: '',
        prescricao,
      })
      setPrescricao('')
      recarregarReceitas(pacienteId)
      await prontuariosApi.abrirReceitaPdf(criada.id).catch(() => {})
    } catch {
      setErro('Não foi possível emitir a receita.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Receitas"
        subtitle={
          podeEmitir
            ? 'Selecione o paciente para imprimir uma receita já emitida ou emitir uma nova em nome do médico responsável'
            : 'Selecione o paciente para imprimir uma receita já emitida'
        }
        icon={Printer}
      />

      <Card className="p-4 mb-6 max-w-md">
        <Label>Paciente</Label>
        <SeletorPaciente pacientes={pacientes} value={pacienteId} onChange={setPacienteId} />
      </Card>

      {pacienteId && podeEmitir && (
        <Card className="p-4 mb-6 max-w-md space-y-3">
          <p className="font-medium text-slate-800 flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Nova receita
          </p>
          <p className="text-xs text-slate-400">
            Use quando o médico passou a prescrição por telefone/mensagem e não está na clínica para lançar ele mesmo.
          </p>
          <div>
            <Label>Médico responsável</Label>
            <Select value={medicoId} onChange={(e) => setMedicoId(e.target.value)}>
              <option value="">Selecione...</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={dataReceita} onChange={(e) => setDataReceita(e.target.value)} />
          </div>
          <div>
            <Label>Prescrição</Label>
            <Textarea
              rows={5}
              value={prescricao}
              onChange={(e) => setPrescricao(e.target.value)}
              placeholder="Medicamento, dosagem, posologia..."
            />
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <Button onClick={emitirReceita} disabled={salvando}>
            {salvando ? 'Emitindo...' : 'Emitir e abrir PDF'}
          </Button>
        </Card>
      )}

      {!pacienteId ? (
        <EmptyState text="Selecione um paciente para ver as receitas dele." />
      ) : carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : receitas.length === 0 ? (
        <EmptyState text="Nenhuma receita emitida para este paciente ainda." />
      ) : (
        <div className="space-y-3">
          {receitas.map((r) => (
            <Card key={r.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-800">{formatarDataBr(r.data)}</p>
                <p className="text-xs text-slate-400">Dr(a). {r.medico_nome}</p>
              </div>
              <button
                type="button"
                onClick={() => prontuariosApi.abrirReceitaPdf(r.id).catch(() => alert('Erro ao gerar a receita.'))}
                className="flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
              >
                <Printer className="h-4 w-4" /> Imprimir
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
