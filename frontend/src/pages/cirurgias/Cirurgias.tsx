import { useEffect, useState } from 'react'
import { FileDown, Scissors } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Select, Textarea } from '../../components/ui'
import { cirurgiasApi, type CirurgiaForm } from '../../api/cirurgias'
import { pacientesApi } from '../../api/pacientes'
import { medicosApi } from '../../api/medicos'
import { useAuth } from '../../contexts/AuthContext'
import { ApiError } from '../../api/client'
import type { Cirurgia, Medico, Paciente } from '../../types'

const vazio: CirurgiaForm = {
  paciente_id: '',
  medico_id: '',
  nome_cirurgia: '',
  data_prevista: '',
  local_hospital: '',
  equipe: '',
  observacoes: '',
}

function formatarData(v?: string | null) {
  if (!v) return '—'
  const d = new Date(v.includes('T') || v.includes(' ') ? v.replace(' ', 'T') : `${v}T00:00:00`)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleDateString('pt-BR')
}

export default function Cirurgias() {
  const { usuario } = useAuth()
  const podeExcluir = usuario?.role === 'admin' || usuario?.role === 'coordenador'
  const [cirurgias, setCirurgias] = useState<Cirurgia[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Cirurgia | null>(null)
  const [form, setForm] = useState<CirurgiaForm>(vazio)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    Promise.all([cirurgiasApi.listar(), pacientesApi.listar(), medicosApi.listar()])
      .then(([c, p, m]) => {
        setCirurgias(c)
        setPacientes(p)
        setMedicos(m)
      })
      .catch(() => setErro('Não foi possível carregar as cirurgias. Verifique se o backend está rodando.'))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  function abrirNovo() {
    setEditando(null)
    setForm(vazio)
    setErroForm(null)
    setModalAberto(true)
  }

  function abrirEdicao(c: Cirurgia) {
    setEditando(c)
    setForm({
      paciente_id: c.paciente_id,
      medico_id: c.medico_id ?? '',
      nome_cirurgia: c.nome_cirurgia,
      data_prevista: c.data_prevista ?? '',
      local_hospital: c.local_hospital ?? '',
      equipe: c.equipe ?? '',
      observacoes: c.observacoes ?? '',
    })
    setErroForm(null)
    setModalAberto(true)
  }

  async function salvar() {
    setSalvando(true)
    setErroForm(null)
    try {
      const dados: CirurgiaForm = { ...form, medico_id: form.medico_id || null }
      if (editando) {
        await cirurgiasApi.atualizar(editando.id, dados)
      } else {
        await cirurgiasApi.criar(dados)
      }
      setModalAberto(false)
      carregar()
    } catch (err) {
      setErroForm(err instanceof ApiError ? err.message : 'Erro ao salvar cirurgia.')
    } finally {
      setSalvando(false)
    }
  }

  async function finalizar(c: Cirurgia) {
    try {
      await cirurgiasApi.finalizar(c.id)
      carregar()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao finalizar relatório.')
    }
  }

  async function remover(c: Cirurgia) {
    if (!confirm(`Remover o registro de cirurgia "${c.nome_cirurgia}"?`)) return
    await cirurgiasApi.remover(c.id)
    carregar()
  }

  async function baixarPdf(c: Cirurgia) {
    try {
      await cirurgiasApi.abrirRelatorioPdf(c.id)
    } catch {
      alert('Erro ao gerar o PDF do relatório.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Relatórios cirúrgicos"
        subtitle="Cadastro colaborativo de cirurgias — vários usuários podem preencher, o médico recebe aviso quando estiver pronto"
        icon={Scissors}
        action={<Button onClick={abrirNovo}>+ Nova cirurgia</Button>}
      />

      {erro && <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">{erro}</div>}

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : cirurgias.length === 0 ? (
        <EmptyState text="Nenhuma cirurgia cadastrada ainda." icon={Scissors} />
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
                  <p className="text-sm text-slate-500 mt-0.5">
                    Paciente: <span className="font-medium text-slate-700">{c.paciente_nome}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {c.medico_nome ? `Dr(a). ${c.medico_nome}` : 'Sem médico definido'} · Data prevista: {formatarData(c.data_prevista)}
                    {c.local_hospital ? ` · ${c.local_hospital}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => abrirEdicao(c)}>
                    Editar
                  </Button>
                  {c.status === 'rascunho' && (
                    <Button variant="secondary" onClick={() => finalizar(c)}>
                      Finalizar e avisar médico
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => baixarPdf(c)}>
                    <FileDown className="h-3.5 w-3.5" /> PDF
                  </Button>
                  {podeExcluir && (
                    <Button variant="danger" onClick={() => remover(c)}>
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editando ? 'Editar cirurgia' : 'Nova cirurgia'}>
        <div className="space-y-3">
          {editando?.status === 'pronta' && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Este relatório já está pronto. Ao salvar uma alteração, ele volta para "em preenchimento" e precisará ser finalizado de novo.
            </p>
          )}
          <div>
            <Label>Paciente</Label>
            <Select
              value={form.paciente_id}
              onChange={(e) => setForm({ ...form, paciente_id: e.target.value })}
              disabled={!!editando}
            >
              <option value="">Selecione...</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Nome da cirurgia</Label>
            <Input value={form.nome_cirurgia} onChange={(e) => setForm({ ...form, nome_cirurgia: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Médico responsável</Label>
              <Select value={form.medico_id ?? ''} onChange={(e) => setForm({ ...form, medico_id: e.target.value })}>
                <option value="">A definir</option>
                {medicos.map((m) => (
                  <option key={m.id} value={m.id}>
                    Dr(a). {m.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Data prevista</Label>
              <Input
                type="date"
                value={form.data_prevista ?? ''}
                onChange={(e) => setForm({ ...form, data_prevista: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Local / Hospital</Label>
            <Input value={form.local_hospital ?? ''} onChange={(e) => setForm({ ...form, local_hospital: e.target.value })} />
          </div>
          <div>
            <Label>Equipe (anestesista, auxiliares...)</Label>
            <Input value={form.equipe ?? ''} onChange={(e) => setForm({ ...form, equipe: e.target.value })} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea rows={3} value={form.observacoes ?? ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
          {erroForm && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroForm}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando || !form.paciente_id || !form.nome_cirurgia}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
