import { useEffect, useState } from 'react'
import { FlaskConical, Plus, Printer } from 'lucide-react'
import { Button, Card, EmptyState, Input, Label, PageHeader, Select, Textarea } from '../../components/ui'
import { SeletorPaciente } from '../../components/SeletorPaciente'
import { pacientesApi } from '../../api/pacientes'
import { prontuariosApi } from '../../api/prontuarios'
import { medicosApi } from '../../api/medicos'
import { useAuth } from '../../contexts/AuthContext'
import type { Medico, Paciente, PedidoExameResumo } from '../../types'

function formatarDataBr(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-BR')
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10)
}

const PODE_EMITIR = ['admin', 'coordenador', 'recepcao']

export default function PedidosExame() {
  const { usuario } = useAuth()
  const podeEmitir = Boolean(usuario && PODE_EMITIR.includes(usuario.role))

  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [pacienteId, setPacienteId] = useState('')
  const [pedidos, setPedidos] = useState<PedidoExameResumo[]>([])
  const [carregando, setCarregando] = useState(false)

  const [medicos, setMedicos] = useState<Medico[]>([])
  const [medicoId, setMedicoId] = useState('')
  const [dataPedido, setDataPedido] = useState(hojeIso())
  const [pedidoExames, setPedidoExames] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    pacientesApi.listar().then(setPacientes).catch(() => {})
    if (podeEmitir) medicosApi.listar().then(setMedicos).catch(() => {})
  }, [podeEmitir])

  function recarregarPedidos(id: string) {
    setCarregando(true)
    prontuariosApi
      .listarPedidosExamePorPaciente(id)
      .then(setPedidos)
      .finally(() => setCarregando(false))
  }

  useEffect(() => {
    if (!pacienteId) {
      setPedidos([])
      return
    }
    recarregarPedidos(pacienteId)
  }, [pacienteId])

  async function emitirPedido() {
    if (!medicoId || !pedidoExames.trim()) {
      setErro('Selecione o médico responsável e descreva os exames solicitados.')
      return
    }
    setErro('')
    setSalvando(true)
    try {
      const criado = await prontuariosApi.criar({
        paciente_id: pacienteId,
        medico_id: medicoId,
        data: dataPedido,
        queixa: '',
        diagnostico: '',
        prescricao: '',
        pedido_exames: pedidoExames,
      })
      setPedidoExames('')
      recarregarPedidos(pacienteId)
      await prontuariosApi.abrirPedidoExamesPdf(criado.id).catch(() => {})
    } catch {
      setErro('Não foi possível emitir o pedido de exames.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Pedidos de exames"
        subtitle={
          podeEmitir
            ? 'Selecione o paciente para imprimir um pedido já emitido ou emitir um novo em nome do médico responsável'
            : 'Selecione o paciente para imprimir um pedido de exames já emitido'
        }
        icon={FlaskConical}
      />

      <Card className="p-4 mb-6 max-w-md">
        <Label>Paciente</Label>
        <SeletorPaciente pacientes={pacientes} value={pacienteId} onChange={setPacienteId} />
      </Card>

      {pacienteId && podeEmitir && (
        <Card className="p-4 mb-6 max-w-md space-y-3">
          <p className="font-medium text-slate-800 flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Novo pedido de exames
          </p>
          <p className="text-xs text-slate-400">
            Use quando o médico passou a solicitação por telefone/mensagem e não está na clínica para lançar ele mesmo.
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
            <Input type="date" value={dataPedido} onChange={(e) => setDataPedido(e.target.value)} />
          </div>
          <div>
            <Label>Exames solicitados</Label>
            <Textarea
              rows={5}
              value={pedidoExames}
              onChange={(e) => setPedidoExames(e.target.value)}
              placeholder="Nome do exame, observações..."
            />
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <Button onClick={emitirPedido} disabled={salvando}>
            {salvando ? 'Emitindo...' : 'Emitir e abrir PDF'}
          </Button>
        </Card>
      )}

      {!pacienteId ? (
        <EmptyState text="Selecione um paciente para ver os pedidos de exames dele." />
      ) : carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : pedidos.length === 0 ? (
        <EmptyState text="Nenhum pedido de exames emitido para este paciente ainda." />
      ) : (
        <div className="space-y-3">
          {pedidos.map((p) => (
            <Card key={p.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-800">{formatarDataBr(p.data)}</p>
                <p className="text-xs text-slate-400">Dr(a). {p.medico_nome}</p>
              </div>
              <button
                type="button"
                onClick={() => prontuariosApi.abrirPedidoExamesPdf(p.id).catch(() => alert('Erro ao gerar o pedido de exames.'))}
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
