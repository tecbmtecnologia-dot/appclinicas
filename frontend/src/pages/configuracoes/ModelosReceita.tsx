import { useEffect, useState } from 'react'
import { FileSignature } from 'lucide-react'
import { Button, Card, EmptyState, Input, Label, PageHeader, Textarea } from '../../components/ui'
import { modelosReceitaApi, type ModeloReceitaForm } from '../../api/modelosReceita'
import { ApiError } from '../../api/client'
import type { ModeloReceita } from '../../types'

const vazio: ModeloReceitaForm = { nome: '', texto: '' }

export default function ModelosReceita() {
  const [modelos, setModelos] = useState<ModeloReceita[]>([])
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState<ModeloReceitaForm>(vazio)
  const [editando, setEditando] = useState<ModeloReceita | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    modelosReceitaApi
      .listar()
      .then(setModelos)
      .catch(() => setErro('Não foi possível carregar os modelos de receita.'))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  function abrirEdicao(m: ModeloReceita) {
    setEditando(m)
    setForm({ nome: m.nome, texto: m.texto })
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
        await modelosReceitaApi.atualizar(editando.id, form)
      } else {
        await modelosReceitaApi.criar(form)
      }
      cancelarEdicao()
      carregar()
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao salvar modelo.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(m: ModeloReceita) {
    if (!confirm(`Remover o modelo "${m.nome}"?`)) return
    await modelosReceitaApi.remover(m.id)
    if (editando?.id === m.id) cancelarEdicao()
    carregar()
  }

  return (
    <div>
      <PageHeader
        title="Modelos de receita"
        subtitle="Cadastre aqui os modelos que os médicos da clínica poderão inserir na prescrição do prontuário"
        icon={FileSignature}
      />

      <Card className="p-4 mb-6 max-w-xl space-y-3">
        <Label>{editando ? `Editando "${editando.nome}"` : 'Novo modelo (ex: Kit pós-operatório padrão)'}</Label>
        <div>
          <Input placeholder="Nome do modelo" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div>
          <Textarea
            rows={4}
            placeholder="Texto da receita"
            value={form.texto}
            onChange={(e) => setForm({ ...form, texto: e.target.value })}
          />
        </div>
        {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}
        <div className="flex justify-end gap-2">
          {editando && (
            <Button variant="secondary" onClick={cancelarEdicao}>
              Cancelar
            </Button>
          )}
          <Button onClick={salvar} disabled={salvando || !form.nome.trim() || !form.texto.trim()}>
            {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : '+ Criar modelo'}
          </Button>
        </div>
      </Card>

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : modelos.length === 0 ? (
        <EmptyState text="Nenhum modelo de receita cadastrado ainda." icon={FileSignature} />
      ) : (
        <div className="space-y-3">
          {modelos.map((m) => (
            <Card key={m.id} className="p-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">{m.nome}</p>
                <p className="text-xs text-slate-400 whitespace-pre-line">{m.texto}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" onClick={() => abrirEdicao(m)}>
                  Editar
                </Button>
                <Button variant="danger" onClick={() => remover(m)}>
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
