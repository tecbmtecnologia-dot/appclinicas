import { useEffect, useState } from 'react'
import { Building } from 'lucide-react'
import { Button, Card, EmptyState, Input, Label, Modal, PageHeader } from '../../components/ui'
import { hospitaisApi } from '../../api/hospitais'
import type { Hospital } from '../../types'

const vazio = { nome: '', endereco: '', telefone: '' }

export default function Hospitais() {
  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Hospital | null>(null)
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    hospitaisApi
      .listar()
      .then(setHospitais)
      .catch(() => setErro('Não foi possível carregar os hospitais. Verifique se o backend está rodando.'))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  function abrirNovo() {
    setEditando(null)
    setForm(vazio)
    setModalAberto(true)
  }

  function abrirEdicao(h: Hospital) {
    setEditando(h)
    setForm({ nome: h.nome, endereco: h.endereco, telefone: h.telefone })
    setModalAberto(true)
  }

  async function salvar() {
    setSalvando(true)
    try {
      if (editando) {
        await hospitaisApi.atualizar(editando.id, form)
      } else {
        await hospitaisApi.criar(form)
      }
      setModalAberto(false)
      carregar()
    } catch {
      alert('Erro ao salvar hospital.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(h: Hospital) {
    if (!confirm(`Remover o hospital ${h.nome}?`)) return
    await hospitaisApi.remover(h.id)
    carregar()
  }

  return (
    <div>
      <PageHeader
        title="Hospitais"
        subtitle="Cadastro dos hospitais onde os médicos operam, para selecionar nas cirurgias"
        icon={Building}
        action={<Button onClick={abrirNovo}>+ Novo hospital</Button>}
      />

      {erro && <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">{erro}</div>}

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : hospitais.length === 0 ? (
        <EmptyState text="Nenhum hospital cadastrado ainda." icon={Building} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Nome</th>
                  <th className="px-4 py-2.5 font-medium">Endereço</th>
                  <th className="px-4 py-2.5 font-medium">Telefone</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {hospitais.map((h) => (
                  <tr key={h.id} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{h.nome}</td>
                    <td className="px-4 py-2.5 text-slate-600">{h.endereco}</td>
                    <td className="px-4 py-2.5 text-slate-600">{h.telefone}</td>
                    <td className="px-4 py-2.5 text-right space-x-2 whitespace-nowrap">
                      <Button variant="ghost" onClick={() => abrirEdicao(h)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => remover(h)}>
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

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editando ? 'Editar hospital' : 'Novo hospital'}>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <Label>Endereço</Label>
            <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
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
