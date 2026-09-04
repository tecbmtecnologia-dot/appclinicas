import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader } from '../../components/ui'
import { pacientesApi } from '../../api/pacientes'
import type { Paciente } from '../../types'

const vazio = { nome: '', cpf: '', rg: '', data_nascimento: '', telefone: '', email: '', convenio: '', endereco: '' }

export default function Pacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Paciente | null>(null)
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    pacientesApi
      .listar()
      .then(setPacientes)
      .catch(() => setErro('Não foi possível carregar pacientes. Verifique se o backend está rodando.'))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  function abrirNovo() {
    setEditando(null)
    setForm(vazio)
    setModalAberto(true)
  }

  function abrirEdicao(p: Paciente) {
    setEditando(p)
    setForm({
      nome: p.nome,
      cpf: p.cpf,
      rg: p.rg ?? '',
      data_nascimento: p.data_nascimento,
      telefone: p.telefone,
      email: p.email,
      convenio: p.convenio,
      endereco: p.endereco,
    })
    setModalAberto(true)
  }

  async function salvar() {
    setSalvando(true)
    try {
      if (editando) {
        await pacientesApi.atualizar(editando.id, form)
      } else {
        await pacientesApi.criar(form)
      }
      setModalAberto(false)
      carregar()
    } catch {
      alert('Erro ao salvar paciente.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(p: Paciente) {
    if (!confirm(`Remover o paciente ${p.nome}?`)) return
    await pacientesApi.remover(p.id)
    carregar()
  }

  const filtrados = pacientes.filter((p) =>
    `${p.nome} ${p.cpf}`.toLowerCase().includes(busca.toLowerCase()),
  )

  return (
    <div>
      <PageHeader
        title="Pacientes"
        subtitle="Cadastro de pacientes da clínica"
        icon={Users}
        action={<Button onClick={abrirNovo}>+ Novo paciente</Button>}
      />

      {erro && <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">{erro}</div>}

      <div className="mb-4 max-w-sm">
        <Input placeholder="Buscar por nome ou CPF..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <EmptyState text="Nenhum paciente cadastrado ainda." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Nome</th>
                  <th className="px-4 py-2.5 font-medium">CPF</th>
                  <th className="px-4 py-2.5 font-medium">Telefone</th>
                  <th className="px-4 py-2.5 font-medium">Convênio</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{p.nome}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.cpf}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.telefone}</td>
                    <td className="px-4 py-2.5">
                      {p.convenio ? <Badge tone="blue">{p.convenio}</Badge> : <Badge>Particular</Badge>}
                    </td>
                    <td className="px-4 py-2.5 text-right space-x-2 whitespace-nowrap">
                      <Button variant="ghost" onClick={() => abrirEdicao(p)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => remover(p)}>
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

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editando ? 'Editar paciente' : 'Novo paciente'}>
        <div className="space-y-3">
          <div>
            <Label>Nome completo</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>CPF</Label>
              <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
            </div>
            <div>
              <Label>RG</Label>
              <Input value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} />
            </div>
            <div>
              <Label>Data de nascimento</Label>
              <Input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
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
            <Label>Convênio (deixe em branco se particular)</Label>
            <Input value={form.convenio} onChange={(e) => setForm({ ...form, convenio: e.target.value })} />
          </div>
          <div>
            <Label>Endereço</Label>
            <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
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
