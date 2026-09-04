import { useEffect, useState } from 'react'
import { Stethoscope } from 'lucide-react'
import { Button, Card, EmptyState, Input, Label, Modal, PageHeader } from '../../components/ui'
import { medicosApi } from '../../api/medicos'
import type { Medico } from '../../types'

const vazio = { nome: '', crm: '', especialidade: '', telefone: '', email: '' }

export default function Medicos() {
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Medico | null>(null)
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    medicosApi
      .listar()
      .then(setMedicos)
      .catch(() => setErro('Não foi possível carregar médicos. Verifique se o backend está rodando.'))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  function abrirNovo() {
    setEditando(null)
    setForm(vazio)
    setModalAberto(true)
  }

  function abrirEdicao(m: Medico) {
    setEditando(m)
    setForm({ nome: m.nome, crm: m.crm, especialidade: m.especialidade, telefone: m.telefone, email: m.email })
    setModalAberto(true)
  }

  async function salvar() {
    setSalvando(true)
    try {
      if (editando) {
        await medicosApi.atualizar(editando.id, form)
      } else {
        await medicosApi.criar(form)
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
