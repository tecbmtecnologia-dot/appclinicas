import { useEffect, useState } from 'react'
import { PackagePlus } from 'lucide-react'
import { Button, Card, EmptyState, Input, Label, PageHeader } from '../../components/ui'
import { itensCirurgiaApi, type ItemCirurgiaForm } from '../../api/itensCirurgia'
import { ApiError } from '../../api/client'
import type { ItemCirurgia } from '../../types'

const vazio: ItemCirurgiaForm = { nome: '' }

export default function ItensCirurgia() {
  const [itens, setItens] = useState<ItemCirurgia[]>([])
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState<ItemCirurgiaForm>(vazio)
  const [editando, setEditando] = useState<ItemCirurgia | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    itensCirurgiaApi
      .listar()
      .then(setItens)
      .catch(() => setErro('Não foi possível carregar os itens de cirurgia.'))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  function abrirEdicao(i: ItemCirurgia) {
    setEditando(i)
    setForm({ nome: i.nome })
    setErro(null)
  }

  function cancelarEdicao() {
    setEditando(null)
    setForm(vazio)
    setErro(null)
  }

  async function salvar() {
    setSalvando(true)
    setErro(null)
    try {
      if (editando) {
        await itensCirurgiaApi.atualizar(editando.id, form)
      } else {
        await itensCirurgiaApi.criar(form)
      }
      cancelarEdicao()
      carregar()
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao salvar item.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(i: ItemCirurgia) {
    if (!confirm(`Remover o item "${i.nome}"?`)) return
    await itensCirurgiaApi.remover(i.id)
    if (editando?.id === i.id) cancelarEdicao()
    carregar()
  }

  return (
    <div>
      <PageHeader
        title="Itens de cirurgia"
        subtitle="Opcional — cadastre aqui só se esta clínica usa itens/materiais fixos que aparecem pra selecionar no cadastro de cirurgias"
        icon={PackagePlus}
      />

      <Card className="p-4 mb-6 max-w-xl space-y-3">
        <Label>{editando ? `Editando "${editando.nome}"` : 'Novo item (ex: Kit de sutura, Prótese X)'}</Label>
        <div className="flex gap-2">
          <Input placeholder="Nome do item" value={form.nome} onChange={(e) => setForm({ nome: e.target.value })} />
          <Button onClick={salvar} disabled={salvando || !form.nome.trim()}>
            {salvando ? 'Salvando...' : editando ? 'Salvar' : '+ Criar'}
          </Button>
          {editando && (
            <Button variant="secondary" onClick={cancelarEdicao}>
              Cancelar
            </Button>
          )}
        </div>
        {erro && <p className="text-sm text-red-600 mt-2">{erro}</p>}
      </Card>

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : itens.length === 0 ? (
        <EmptyState text="Nenhum item cadastrado ainda — esta clínica não precisa se não usar." icon={PackagePlus} />
      ) : (
        <div className="space-y-3">
          {itens.map((i) => (
            <Card key={i.id} className="p-4 flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-800">{i.nome}</p>
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" onClick={() => abrirEdicao(i)}>
                  Editar
                </Button>
                <Button variant="danger" onClick={() => remover(i)}>
                  Remover
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
