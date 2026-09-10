import { useState } from 'react'
import { UserCog } from 'lucide-react'
import { Button, Card, Input, Label, PageHeader } from '../../components/ui'
import { authApi } from '../../api/auth'
import { useAuth } from '../../contexts/AuthContext'
import { ApiError } from '../../api/client'

export default function MeuPerfil() {
  const { usuario, atualizarUsuario } = useAuth()
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [senha, setSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    setMensagem(null)
    try {
      await authApi.atualizarMe({ nome, email, senha: senha || undefined })
      await atualizarUsuario()
      setSenha('')
      setMensagem('Dados atualizados com sucesso.')
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível salvar as alterações.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="max-w-lg">
      <PageHeader icon={UserCog} title="Meu perfil" subtitle="Dados de acesso do administrador da plataforma" />

      <Card className="p-6">
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <Label>Nome completo</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label>Nova senha (deixe em branco para manter)</Label>
            <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={6} />
          </div>
          {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</p>}
          {mensagem && (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{mensagem}</p>
          )}
          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
