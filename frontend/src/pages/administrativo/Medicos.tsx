import { useEffect, useState } from 'react'
import { Stethoscope } from 'lucide-react'
import { Button, Card, EmptyState, Input, Label, Modal, PageHeader } from '../../components/ui'
import { medicosApi, type MedicoForm } from '../../api/medicos'
import { hospitaisApi } from '../../api/hospitais'
import type { Hospital, Medico } from '../../types'

const vazio: MedicoForm = { nome: '', crm: '', especialidade: '', telefone: '', email: '', hospitais: [] }

const DIAS_SEMANA_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

interface DiaDisponibilidadeForm {
  ativo: boolean
  hora_inicio: string
  hora_fim: string
}

function disponibilidadeVazia(): DiaDisponibilidadeForm[] {
  return DIAS_SEMANA_LABELS.map(() => ({ ativo: false, hora_inicio: '08:00', hora_fim: '18:00' }))
}

function paraFormulario(disponibilidade: Medico['disponibilidade']): DiaDisponibilidadeForm[] {
  const dias = disponibilidadeVazia()
  for (const d of disponibilidade) {
    dias[d.dia_semana] = { ativo: true, hora_inicio: d.hora_inicio, hora_fim: d.hora_fim }
  }
  return dias
}

export default function Medicos() {
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Medico | null>(null)
  const [form, setForm] = useState<MedicoForm>(vazio)
  const [disponibilidade, setDisponibilidade] = useState<DiaDisponibilidadeForm[]>(disponibilidadeVazia())
  const [intervaloSlot, setIntervaloSlot] = useState(30)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    Promise.all([medicosApi.listar(), hospitaisApi.listar()])
      .then(([m, h]) => {
        setMedicos(m)
        setHospitais(h)
      })
      .catch(() => setErro('Não foi possível carregar médicos. Verifique se o backend está rodando.'))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  function abrirNovo() {
    setEditando(null)
    setForm(vazio)
    setDisponibilidade(disponibilidadeVazia())
    setIntervaloSlot(30)
    setModalAberto(true)
  }

  function abrirEdicao(m: Medico) {
    setEditando(m)
    setForm({
      nome: m.nome,
      crm: m.crm,
      especialidade: m.especialidade,
      telefone: m.telefone,
      email: m.email,
      hospitais: m.hospitais.map((h) => h.id),
    })
    setDisponibilidade(paraFormulario(m.disponibilidade ?? []))
    setIntervaloSlot(m.intervalo_slot_minutos ?? 30)
    setModalAberto(true)
  }

  function alternarDia(dia: number) {
    setDisponibilidade((atual) => atual.map((d, i) => (i === dia ? { ...d, ativo: !d.ativo } : d)))
  }

  function atualizarHorarioDia(dia: number, campo: 'hora_inicio' | 'hora_fim', valor: string) {
    setDisponibilidade((atual) => atual.map((d, i) => (i === dia ? { ...d, [campo]: valor } : d)))
  }

  function alternarHospital(id: string) {
    setForm((f) => ({
      ...f,
      hospitais: f.hospitais?.includes(id) ? f.hospitais.filter((h) => h !== id) : [...(f.hospitais ?? []), id],
    }))
  }

  async function salvar() {
    setSalvando(true)
    try {
      const dados: MedicoForm = {
        ...form,
        intervalo_slot_minutos: intervaloSlot,
        disponibilidade: disponibilidade
          .map((d, dia_semana) => ({ ...d, dia_semana }))
          .filter((d) => d.ativo)
          .map(({ dia_semana, hora_inicio, hora_fim }) => ({ dia_semana, hora_inicio, hora_fim })),
      }
      if (editando) {
        await medicosApi.atualizar(editando.id, dados)
      } else {
        await medicosApi.criar(dados)
      }
      setModalAberto(false)
      carregar()
    } catch {
      alert('Erro ao salvar médico.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(m: Medico) {
    if (!confirm(`Remover o médico ${m.nome}?`)) return
    await medicosApi.remover(m.id)
    carregar()
  }

  return (
    <div>
      <PageHeader
        title="Médicos"
        subtitle="Cadastro do corpo clínico"
        icon={Stethoscope}
        action={<Button onClick={abrirNovo}>+ Novo médico</Button>}
      />

      {erro && <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">{erro}</div>}

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : medicos.length === 0 ? (
        <EmptyState text="Nenhum médico cadastrado ainda." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Nome</th>
                  <th className="px-4 py-2.5 font-medium">CRM</th>
                  <th className="px-4 py-2.5 font-medium">Especialidade</th>
                  <th className="px-4 py-2.5 font-medium">Telefone</th>
                  <th className="px-4 py-2.5 font-medium">Hospitais</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {medicos.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 font-medium text-slate-800">Dr(a). {m.nome}</td>
                    <td className="px-4 py-2.5 text-slate-600">{m.crm}</td>
                    <td className="px-4 py-2.5 text-slate-600">{m.especialidade}</td>
                    <td className="px-4 py-2.5 text-slate-600">{m.telefone}</td>
                    <td className="px-4 py-2.5 text-slate-600">{m.hospitais.map((h) => h.nome).join(', ') || '—'}</td>
                    <td className="px-4 py-2.5 text-right space-x-2 whitespace-nowrap">
                      <Button variant="ghost" onClick={() => abrirEdicao(m)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => remover(m)}>
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editando ? 'Editar médico' : 'Novo médico'}>
        <div className="space-y-3">
          <div>
            <Label>Nome completo</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CRM</Label>
              <Input value={form.crm} onChange={(e) => setForm({ ...form, crm: e.target.value })} />
            </div>
            <div>
              <Label>Especialidade</Label>
              <Input value={form.especialidade} onChange={(e) => setForm({ ...form, especialidade: e.target.value })} />
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
          <div>
            <Label>Hospitais que opera</Label>
            {hospitais.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhum hospital cadastrado ainda — cadastre em "Hospitais" no menu.</p>
            ) : (
              <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg px-2 py-1.5 space-y-0.5">
                {hospitais.map((h) => (
                  <label key={h.id} className="flex items-center gap-2 text-sm px-1 py-1 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={form.hospitais?.includes(h.id) ?? false} onChange={() => alternarHospital(h.id)} />
                    {h.nome}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label>Disponibilidade para agendamento</Label>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                Horários de
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={intervaloSlot}
                  onChange={(e) => setIntervaloSlot(Math.max(5, Number(e.target.value) || 30))}
                  className="w-14 rounded-lg border border-slate-300 px-1.5 py-0.5 text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                />
                em {intervaloSlot} min
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-1.5">
              Marque os dias em que o médico atende. Se nenhum dia for marcado, a agenda fica livre (sem restrição de horário).
            </p>
            <div className="space-y-1.5">
              {DIAS_SEMANA_LABELS.map((label, dia) => {
                const d = disponibilidade[dia]
                return (
                  <div key={label} className="flex items-center gap-2 text-sm">
                    <label className="flex items-center gap-2 w-28 shrink-0 cursor-pointer">
                      <input type="checkbox" checked={d.ativo} onChange={() => alternarDia(dia)} />
                      {label}
                    </label>
                    {d.ativo ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="time"
                          value={d.hora_inicio}
                          onChange={(e) => atualizarHorarioDia(dia, 'hora_inicio', e.target.value)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                        />
                        <span className="text-slate-400">às</span>
                        <input
                          type="time"
                          value={d.hora_fim}
                          onChange={(e) => atualizarHorarioDia(dia, 'hora_fim', e.target.value)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                        />
                      </div>
                    ) : (
                      <span className="text-slate-300">Não atende</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
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
    </div>
  )
}
