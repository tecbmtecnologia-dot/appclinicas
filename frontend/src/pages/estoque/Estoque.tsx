import { useEffect, useState } from 'react'
import { Boxes, FileDown } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Label, PageHeader } from '../../components/ui'
import { estoqueApi, type EstoqueItemForm } from '../../api/estoque'
import { ApiError } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import type { EstoqueItem } from '../../types'

const vazio: EstoqueItemForm = { descricao: '', quantidade: 0, data_validade: '' }
const DIAS_ALERTA_VENCIMENTO = 30

function formatarData(valor?: string | null) {
  if (!valor) return '—'
  return new Date(`${valor}T00:00:00`).toLocaleDateString('pt-BR')
}

function statusValidade(dataValidade?: string | null): { texto: string; tone: 'red' | 'amber' | 'green' } | null {
  if (!dataValidade) return null
  const hoje = new Date().toISOString().slice(0, 10)
  if (dataValidade < hoje) return { texto: 'Vencido', tone: 'red' }
  const limite = new Date()
  limite.setDate(limite.getDate() + DIAS_ALERTA_VENCIMENTO)
  if (dataValidade <= limite.toISOString().slice(0, 10)) return { texto: 'Vence em breve', tone: 'amber' }
  return null
}

export default function Estoque() {
  const { usuario } = useAuth()
  const podeEditar = usuario?.role === 'admin'

  const [itens, setItens] = useState<EstoqueItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState<EstoqueItemForm>(vazio)
  const [editando, setEditando] = useState<EstoqueItem | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    estoqueApi
      .listar()
      .then(setItens)
      .catch(() => setErro('Não foi possível carregar o estoque.'))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  function abrirEdicao(i: EstoqueItem) {
    setEditando(i)
    setForm({ descricao: i.descricao, quantidade: i.quantidade, data_validade: i.data_validade ?? '' })
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
      const dados = { ...form, data_validade: form.data_validade || null }
      if (editando) {
        await estoqueApi.atualizar(editando.id, dados)
      } else {
        await estoqueApi.criar(dados)
      }
      cancelarEdicao()
      carregar()
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao salvar item.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(i: EstoqueItem) {
    if (!confirm(`Remover "${i.descricao}" do estoque?`)) return
    await estoqueApi.remover(i.id)
    if (editando?.id === i.id) cancelarEdicao()
    carregar()
  }

  return (
    <div>
      <PageHeader
        title="Estoque"
        subtitle="Itens/materiais da clínica, com quantidade e validade — cada lote é um registro separado"
        icon={Boxes}
        action={
          <Button variant="secondary" onClick={() => estoqueApi.abrirRelatorioPdf().catch(() => alert('Erro ao gerar o PDF.'))}>
            <FileDown className="h-3.5 w-3.5" /> PDF
          </Button>
        }
      />

      {podeEditar && (
        <Card className="p-4 mb-6 max-w-2xl space-y-3">
          <Label>{editando ? `Editando "${editando.descricao}"` : 'Novo item (ex: Botox 100U, lote X)'}</Label>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_160px] gap-2">
            <Input
              placeholder="Descrição do item"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Quantidade"
              value={form.quantidade}
              onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })}
            />
            <Input
              type="date"
              value={form.data_validade ?? ''}
              onChange={(e) => setForm({ ...form, data_validade: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={salvar} disabled={salvando || !form.descricao.trim()}>
              {salvando ? 'Salvando...' : editando ? 'Salvar' : '+ Adicionar'}
            </Button>
            {editando && (
              <Button variant="secondary" onClick={cancelarEdicao}>
                Cancelar
              </Button>
            )}
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
        </Card>
      )}

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : itens.length === 0 ? (
        <EmptyState text="Nenhum item cadastrado no estoque ainda." icon={Boxes} />
      ) : (
        <div className="space-y-2">
          {itens.map((i) => {
            const status = statusValidade(i.data_validade)
            return (
              <Card key={i.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">{i.descricao}</p>
                    {status && <Badge tone={status.tone}>{status.texto}</Badge>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Validade: {formatarData(i.data_validade)} · Quantidade: {i.quantidade}
                  </p>
                </div>
                {podeEditar && (
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" onClick={() => abrirEdicao(i)}>
                      Editar
                    </Button>
                    <Button variant="danger" onClick={() => remover(i)}>
                      Remover
                    </Button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
