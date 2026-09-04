import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users2, Video } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Textarea } from '../../components/ui'
import { reunioesApi, type ReuniaoForm } from '../../api/reunioes'
import { usuariosApi, type Colega } from '../../api/usuarios'
import { useAuth } from '../../contexts/AuthContext'
import { ApiError } from '../../api/client'
import type { Reuniao } from '../../types'

function agora() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const vazio: ReuniaoForm = { titulo: '', pauta: '', data_hora: agora(), participantes: [] }

function formatarDataHora(v: string) {
  const d = new Date(v.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function statusTone(status: Reuniao['status']) {
  if (status === 'em_andamento') return 'green'
  if (status === 'encerrada') return 'slate'
  if (status === 'cancelada') return 'red'
  return 'amber'
}

const ROTULOS_STATUS: Record<Reuniao['status'], string> = {
  agendada: 'Agendada',
  em_andamento: 'Em andamento',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada',
}

export default function Reunioes() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [reunioes, setReunioes] = useState<Reuniao[]>([])
  const [colegas, setColegas] = useState<Colega[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<ReuniaoForm>(vazio)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    Promise.all([reunioesApi.listar(), usuariosApi.colegas()])
      .then(([r, c]) => {
        setReunioes(r)
        setColegas(c)
      })
      .finally(() => setCarregando(false))
  }
  useEffect(carregar, [])

  function abrirNovo() {
    setForm(vazio)
    setErroForm(null)
    setModalAberto(true)
  }

  function alternarParticipante(id: string) {
    setForm((f) => ({
      ...f,
      participantes: f.participantes.includes(id) ? f.participantes.filter((p) => p !== id) : [...f.participantes, id],
    }))
  }

  async function salvar() {
    setSalvando(true)
    setErroForm(null)
    try {
      await reunioesApi.criar(form)
      setModalAberto(false)
      carregar()
    } catch (err) {
      setErroForm(err instanceof ApiError ? err.message : 'Erro ao agendar reunião.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(r: Reuniao) {
    if (!confirm(`Remover a reunião "${r.titulo}"?`)) return
    try {
      await reunioesApi.remover(r.id)
      carregar()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao remover reunião.')
    }
  }

  const podeGerenciar = (r: Reuniao) => usuario?.role === 'admin' || usuario?.id === r.criado_por

  return (
    <div>
      <PageHeader
        title="Reuniões"
        subtitle="Agende e entre em videochamadas com a equipe da clínica"
        icon={Users2}
        action={<Button onClick={abrirNovo}>+ Nova reunião</Button>}
      />

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : reunioes.length === 0 ? (
        <EmptyState text="Nenhuma reunião agendada ainda." icon={Users2} />
      ) : (
        <div className="space-y-3">
          {reunioes.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800">{r.titulo}</p>
                    <Badge tone={statusTone(r.status)}>{ROTULOS_STATUS[r.status]}</Badge>
                  </div>
                  {r.pauta && <p className="text-sm text-slate-500 mt-0.5">{r.pauta}</p>}
                  <p className="text-xs text-slate-400 mt-1">{formatarDataHora(r.data_hora)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Participantes: {r.participantes.map((p) => p.nome).join(', ')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {r.status !== 'encerrada' && r.status !== 'cancelada' && (
                    <Button onClick={() => navigate(`/reunioes/${r.id}/sala`)}>
                      <Video className="h-3.5 w-3.5" /> Entrar
                    </Button>
                  )}
                  {podeGerenciar(r) && (
                    <Button variant="danger" onClick={() => remover(r)}>
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title="Nova reunião">
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          <div>
            <Label>Pauta (opcional)</Label>
            <Textarea rows={2} value={form.pauta ?? ''} onChange={(e) => setForm({ ...form, pauta: e.target.value })} />
          </div>
          <div>
            <Label>Data e hora</Label>
            <Input type="datetime-local" value={form.data_hora} onChange={(e) => setForm({ ...form, data_hora: e.target.value })} />
          </div>
          <div>
            <Label>Participantes</Label>
            <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2">
              {colegas
                .filter((c) => c.id !== usuario?.id)
                .map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm px-1 py-1 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.participantes.includes(c.id)}
                      onChange={() => alternarParticipante(c.id)}
                    />
                    {c.nome}
                  </label>
                ))}
              {colegas.length <= 1 && <p className="text-xs text-slate-400 px-1">Nenhum outro colega cadastrado ainda.</p>}
            </div>
          </div>
          {erroForm && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroForm}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando || !form.titulo || !form.data_hora}>
              {salvando ? 'Salvando...' : 'Agendar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
