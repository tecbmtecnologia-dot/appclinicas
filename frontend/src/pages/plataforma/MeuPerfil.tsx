import { useState } from 'react'
import { UserCog } from 'lucide-react'
import { Button, Card, Input, Label, PageHeader, Select } from '../../components/ui'
import CapturaFoto from '../../components/CapturaFoto'
import { authApi } from '../../api/auth'
import { useAuth } from '../../contexts/AuthContext'
import { ApiError } from '../../api/client'
import type { Sexo } from '../../types'

export default function MeuPerfil() {
  const { usuario, atualizarUsuario } = useAuth()
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [sexo, setSexo] = useState<Sexo | ''>(usuario?.sexo ?? '')
  const [senha, setSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState<string | null>(null)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    setMensagem(null)
    try {
      await authApi.atualizarMe({ nome, email, sexo, senha: senha || undefined })
      await atualizarUsuario()
      setSenha('')
      setMensagem('Dados atualizados com sucesso.')
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível salvar as alterações.')
    } finally {
      setSalvando(false)
    }
  }

  async function enviarFoto(foto: Blob) {
    setEnviandoFoto(true)
    setErroFoto(null)
    try {
      await authApi.enviarFoto(foto)
      await atualizarUsuario()
    } catch (err) {
      setErroFoto(err instanceof ApiError ? err.message : 'Não foi possível salvar a foto.')
    } finally {
      setEnviandoFoto(false)
    }
  }

  return (
    <div className="max-w-lg">
      <PageHeader icon={UserCog} title="Meu perfil" subtitle="Atualize seu nome, e-mail e senha de acesso ao sistema" />

      <Card className="p-6 mb-5">
        <Label>Foto de perfil</Label>
        <div className="mt-2">
          <CapturaFoto fotoAtualUrl={usuario?.foto_url} onNovaFoto={enviarFoto} />
        </div>
        {enviandoFoto && <p className="text-xs text-slate-400 mt-2">Salvando foto...</p>}
        {erroFoto && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-2">{erroFoto}</p>}
      </Card>

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
            <Label>Sexo</Label>
            <Select value={sexo} onChange={(e) => setSexo(e.target.value as Sexo)}>
              <option value="">Não informado</option>
              <option value="feminino">Feminino</option>
              <option value="masculino">Masculino</option>
            </Select>
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
