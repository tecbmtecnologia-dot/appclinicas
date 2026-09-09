import { useEffect, useState } from 'react'
import { Copy, Smartphone } from 'lucide-react'
import { Button, Card, EmptyState, Input, Label, PageHeader } from '../../components/ui'
import { perfisInstalacaoApi } from '../../api/perfisInstalacao'
import { ApiError } from '../../api/client'
import type { PerfilInstalacao } from '../../types'

function linkInstalacao(p: PerfilInstalacao) {
  return `${window.location.origin}/instalar/${p.clinica_slug}/${p.slug}`
}

export default function PerfisInstalacao() {
  const [perfis, setPerfis] = useState<PerfilInstalacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [nome, setNome] = useState('')
  const [editando, setEditando] = useState<PerfilInstalacao | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    perfisInstalacaoApi
      .listar()
      .then(setPerfis)
      .catch(() => setErro('Não foi possível carregar os perfis de instalação.'))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  async function adicionar() {
    setSalvando(true)
    setErro(null)
    try {
      if (editando) {
        await perfisInstalacaoApi.atualizar(editando.id, nome)
      } else {
        await perfisInstalacaoApi.criar(nome)
      }
      setNome('')
      setEditando(null)
      carregar()
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao salvar perfil de instalação.')
    } finally {
      setSalvando(false)
    }
  }

  function abrirEdicao(p: PerfilInstalacao) {
    setEditando(p)
    setNome(p.nome)
    setErro(null)
  }

  function cancelarEdicao() {
    setEditando(null)
    setNome('')
    setErro(null)
  }

  async function remover(p: PerfilInstalacao) {
    if (!confirm(`Remover o perfil de instalação "${p.nome}"? O link parará de funcionar.`)) return
    await perfisInstalacaoApi.remover(p.id)
    if (editando?.id === p.id) cancelarEdicao()
    carregar()
  }

  async function copiarLink(p: PerfilInstalacao) {
    try {
      await navigator.clipboard.writeText(linkInstalacao(p))
      setCopiado(p.id)
      setTimeout(() => setCopiado(null), 2000)
    } catch {
      alert(linkInstalacao(p))
    }
  }

  return (
    <div>
      <PageHeader
        title="Perfis de instalação"
        subtitle="Cada perfil gera um link único — mande o link certo pra cada pessoa instalar o app no celular com o nome dela (logo da clínica sempre aparece)"
        icon={Smartphone}
      />

      <Card className="p-4 mb-6 max-w-xl">
        <Label>
          {editando ? `Editando "${editando.nome}"` : 'Novo perfil (ex: Médicos, Recepção, Consultora, Fisioterapeuta)'}
        </Label>
        <div className="flex gap-2">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do perfil" />
          <Button onClick={adicionar} disabled={salvando || !nome.trim()}>
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
      ) : perfis.length === 0 ? (
        <EmptyState text="Nenhum perfil de instalação criado ainda." icon={Smartphone} />
      ) : (
        <div className="space-y-3">
          {perfis.map((p) => (
            <Card key={p.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">{p.nome}</p>
                <p className="text-xs text-slate-400 truncate">{linkInstalacao(p)}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="secondary" onClick={() => copiarLink(p)}>
                  <Copy className="h-3.5 w-3.5" /> {copiado === p.id ? 'Copiado!' : 'Copiar link'}
                </Button>
                <Button variant="ghost" onClick={() => abrirEdicao(p)}>
                  Editar
                </Button>
                <Button variant="danger" onClick={() => remover(p)}>
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
