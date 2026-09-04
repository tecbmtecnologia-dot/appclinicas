import { useEffect, useMemo, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { Button, Card, EmptyState, Input, Label, PageHeader, Select, Textarea } from '../../components/ui'
import { pacientesApi } from '../../api/pacientes'
import { medicosApi } from '../../api/medicos'
import { prontuariosApi } from '../../api/prontuarios'
import { useAuth } from '../../contexts/AuthContext'
import type { Medico, Paciente, Prontuario as ProntuarioType } from '../../types'

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

const vazio = { medico_id: '', data: hoje(), queixa: '', diagnostico: '', prescricao: '', observacoes: '' }

export default function Prontuario() {
  const { usuario } = useAuth()
  const ehEnfermagem = usuario?.role === 'enfermagem'
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [pacienteId, setPacienteId] = useState('')
  const [registros, setRegistros] = useState<ProntuarioType[]>([])
  const [carregando, setCarregando] = useState(false)
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)

  useEffect(() => {
    pacientesApi.listar().then(setPacientes).catch(() => {})
    medicosApi.listar().then(setMedicos).catch(() => {})
  }, [])

  function carregarRegistros(id: string) {
    setCarregando(true)
    prontuariosApi
      .listarPorPaciente(id)
      .then(setRegistros)
      .finally(() => setCarregando(false))
  }

  useEffect(() => {
    if (pacienteId) carregarRegistros(pacienteId)
    else setRegistros([])
  }, [pacienteId])

  const pacienteSelecionado = useMemo(() => pacientes.find((p) => p.id === pacienteId), [pacientes, pacienteId])

  async function salvar() {
    if (!pacienteId) return
    setSalvando(true)
    try {
      await prontuariosApi.criar({ ...form, paciente_id: pacienteId })
      setForm(vazio)
      setMostrarForm(false)
      carregarRegistros(pacienteId)
    } catch {
      alert('Erro ao salvar registro do prontuário.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <PageHeader title="Prontuário eletrônico" subtitle="Histórico clínico por paciente" icon={ClipboardList} />

      <Card className="p-4 mb-6 max-w-md">
        <Label>Paciente</Label>
        <Select value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
          <option value="">Selecione um paciente...</option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Select>
      </Card>

      {!pacienteId ? (
        <EmptyState text="Selecione um paciente para ver o histórico." />
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Histórico de {pacienteSelecionado?.nome}</h2>
            <Button onClick={() => setMostrarForm((v) => !v)}>
              {mostrarForm ? 'Fechar' : '+ Novo registro'}
            </Button>
          </div>

          {mostrarForm && (
            <Card className="p-5 mb-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Médico responsável</Label>
                  <Select value={form.medico_id} onChange={(e) => setForm({ ...form, medico_id: e.target.value })}>
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
                  <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Queixa principal</Label>
                <Textarea rows={2} value={form.queixa} onChange={(e) => setForm({ ...form, queixa: e.target.value })} />
              </div>
              {!ehEnfermagem && (
                <>
                  <div>
                    <Label>Diagnóstico</Label>
                    <Textarea rows={2} value={form.diagnostico} onChange={(e) => setForm({ ...form, diagnostico: e.target.value })} />
                  </div>
                  <div>
                    <Label>Prescrição</Label>
                    <Textarea rows={2} value={form.prescricao} onChange={(e) => setForm({ ...form, prescricao: e.target.value })} />
                  </div>
                </>
              )}
              <div>
                <Label>{ehEnfermagem ? 'Evolução de enfermagem' : 'Observações'}</Label>
                <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={salvar}
                  disabled={salvando || !form.medico_id || !form.data || (ehEnfermagem && !form.observacoes)}
                >
                  {salvando ? 'Salvando...' : 'Salvar registro'}
                </Button>
              </div>
            </Card>
          )}

          {carregando ? (
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
                    <p className="text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Prescrição: </span>
                      {r.prescricao}
                    </p>
                  )}
                  {r.observacoes && <p className="text-sm text-slate-500 italic mt-1">{r.observacoes}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
