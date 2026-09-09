import { useEffect, useState } from 'react'
import { UserCog2 } from 'lucide-react'
import { Button, Card, EmptyState, Input, Label, Modal, PageHeader } from '../../components/ui'
import { auxiliaresApi } from '../../api/auxiliares'
import type { Auxiliar } from '../../types'

const vazio = { nome: '', funcao: '', telefone: '', email: '' }

export default function Auxiliares() {
  const [auxiliares, setAuxiliares] = useState<Auxiliar[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Auxiliar | null>(null)
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    auxiliaresApi
      .listar()
      .then(setAuxiliares)
      .catch(() => setErro('Não foi possível carregar os auxiliares. Verifique se o backend está rodando.'))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  function abrirNovo() {
    setEditando(null)
    setForm(vazio)
    setModalAberto(true)
  }

  function abrirEdicao(a: Auxiliar) {
    setEditando(a)
    setForm({ nome: a.nome, funcao: a.funcao, telefone: a.telefone, email: a.email })
    setModalAberto(true)
  }

  async function salvar() {
    setSalvando(true)
    try {
      if (editando) {
        await auxiliaresApi.atualizar(editando.id, form)
      } else {
        await auxiliaresApi.criar(form)
      }
      setModalAberto(false)
      carregar()
    } catch {
      alert('Erro ao salvar auxiliar.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(a: Auxiliar) {
    if (!confirm(`Remover o auxiliar ${a.nome}?`)) return
    await auxiliaresApi.remover(a.id)
    carregar()
  }

  return (
    <div>
      <PageHeader
        title="Auxiliares"
        subtitle="Cadastro da equipe de apoio (instrumentadora, circulante, etc.) para selecionar nas cirurgias"
        icon={UserCog2}
        action={<Button onClick={abrirNovo}>+ Novo auxiliar</Button>}
      />

      {erro && <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">{erro}</div>}

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : auxiliares.length === 0 ? (
        <EmptyState text="Nenhum auxiliar cadastrado ainda." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Nome</th>
                  <th className="px-4 py-2.5 font-medium">Função</th>
                  <th className="px-4 py-2.5 font-medium">Telefone</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {auxiliares.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{a.nome}</td>
                    <td className="px-4 py-2.5 text-slate-600">{a.funcao}</td>
                    <td className="px-4 py-2.5 text-slate-600">{a.telefone}</td>
                    <td className="px-4 py-2.5 text-right space-x-2 whitespace-nowrap">
                      <Button variant="ghost" onClick={() => abrirEdicao(a)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => remover(a)}>
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

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editando ? 'Editar auxiliar' : 'Novo auxiliar'}>
        <div className="space-y-3">
          <div>
            <Label>Nome completo</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <Label>Função</Label>
            <Input
              placeholder="Ex: Instrumentadora, Circulante..."
              value={form.funcao}
              onChange={(e) => setForm({ ...form, funcao: e.target.value })}
            />
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
