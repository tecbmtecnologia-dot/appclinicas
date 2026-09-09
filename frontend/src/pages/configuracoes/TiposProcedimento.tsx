import { useEffect, useState } from 'react'
import { ClipboardPlus } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Label, PageHeader } from '../../components/ui'
import { tiposProcedimentoApi, type TipoProcedimentoForm } from '../../api/tiposProcedimento'
import { ApiError } from '../../api/client'
import type { TipoProcedimento } from '../../types'

const vazio: TipoProcedimentoForm = { nome: '', gera_cirurgia: false }

export default function TiposProcedimento() {
  const [tipos, setTipos] = useState<TipoProcedimento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState<TipoProcedimentoForm>(vazio)
  const [editando, setEditando] = useState<TipoProcedimento | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    tiposProcedimentoApi
      .listar()
      .then(setTipos)
      .catch(() => setErro('Não foi possível carregar os tipos de procedimento.'))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  function abrirEdicao(t: TipoProcedimento) {
    setEditando(t)
    setForm({ nome: t.nome, gera_cirurgia: Boolean(t.gera_cirurgia) })
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
        await tiposProcedimentoApi.atualizar(editando.id, form)
      } else {
        await tiposProcedimentoApi.criar(form)
      }
      cancelarEdicao()
      carregar()
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao salvar tipo de procedimento.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(t: TipoProcedimento) {
    if (!confirm(`Remover o tipo "${t.nome}"? Agendamentos que já usam esse tipo ficam sem tipo definido.`)) return
    await tiposProcedimentoApi.remover(t.id)
    if (editando?.id === t.id) cancelarEdicao()
    carregar()
  }

  return (
    <div>
      <PageHeader
        title="Tipos de procedimento"
        subtitle="Cadastre aqui os tipos que aparecem pra selecionar ao criar um agendamento (Consulta, Retorno, Cirurgia etc)"
        icon={ClipboardPlus}
      />

      <Card className="p-4 mb-6 max-w-xl space-y-3">
        <Label>{editando ? `Editando "${editando.nome}"` : 'Novo tipo (ex: Consulta, Retorno, Cirurgia)'}</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Nome do tipo"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <Button onClick={salvar} disabled={salvando || !form.nome.trim()}>
            {salvando ? 'Salvando...' : editando ? 'Salvar' : '+ Criar'}
          </Button>
          {editando && (
            <Button variant="secondary" onClick={cancelarEdicao}>
              Cancelar
            </Button>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.gera_cirurgia}
            onChange={(e) => setForm({ ...form, gera_cirurgia: e.target.checked })}
          />
          Gera registro de cirurgia automaticamente ao agendar (aparece em Cirurgias pra instrumentador/consultora e fisioterapeuta preencherem)
        </label>
        {erro && <p className="text-sm text-red-600 mt-2">{erro}</p>}
      </Card>

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : tipos.length === 0 ? (
        <EmptyState text="Nenhum tipo cadastrado ainda — cadastre Consulta, Cirurgia etc pra liberar a seleção no agendamento." icon={ClipboardPlus} />
      ) : (
        <div className="space-y-3">
          {tipos.map((t) => (
            <Card key={t.id} className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-800">{t.nome}</p>
                {Boolean(t.gera_cirurgia) && <Badge tone="blue">Gera cirurgia</Badge>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" onClick={() => abrirEdicao(t)}>
                  Editar
                </Button>
                <Button variant="danger" onClick={() => remover(t)}>
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
