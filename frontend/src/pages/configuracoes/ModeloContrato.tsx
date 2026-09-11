import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { Button, Card, PageHeader, Textarea } from '../../components/ui'
import { contratoModeloApi } from '../../api/contratoModelo'
import { ApiError } from '../../api/client'

const PLACEHOLDERS: { chave: string; descricao: string }[] = [
  { chave: 'paciente_nome', descricao: 'Nome do paciente' },
  { chave: 'paciente_cpf', descricao: 'CPF do paciente' },
  { chave: 'paciente_rg', descricao: 'RG do paciente' },
  { chave: 'paciente_data_nascimento', descricao: 'Data de nascimento' },
  { chave: 'paciente_telefone', descricao: 'Telefone do paciente' },
  { chave: 'paciente_email', descricao: 'E-mail do paciente' },
  { chave: 'paciente_endereco', descricao: 'Endereço do paciente' },
  { chave: 'clinica_nome', descricao: 'Nome da clínica' },
  { chave: 'clinica_cnpj', descricao: 'CNPJ da clínica' },
  { chave: 'clinica_endereco', descricao: 'Endereço da clínica' },
  { chave: 'data_atual', descricao: 'Data de hoje' },
]

export default function ModeloContrato() {
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    contratoModeloApi
      .obter()
      .then((m) => setTexto(m.texto))
      .catch(() => setErro('Não foi possível carregar o modelo de contrato.'))
      .finally(() => setCarregando(false))
  }, [])

  async function salvar() {
    setSalvando(true)
    setErro(null)
    setSalvo(false)
    try {
      await contratoModeloApi.salvar(texto)
      setSalvo(true)
      setTimeout(() => setSalvo(false), 3000)
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao salvar o modelo.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Modelo de contrato"
        subtitle="Cadastre aqui o texto do contrato que hoje você preenche no Word. Na ficha de cada paciente é possível gerar o PDF já preenchido com os dados dele."
        icon={FileText}
      />

      <Card className="p-4 mb-4 max-w-3xl">
        <p className="text-sm font-medium text-slate-700 mb-2">Marcadores disponíveis</p>
        <p className="text-xs text-slate-400 mb-2">
          Cole o texto do seu contrato abaixo e use os marcadores onde os dados do paciente devem entrar. Eles são
          substituídos automaticamente ao gerar o PDF.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map((p) => (
            <span
              key={p.chave}
              title={p.descricao}
              className="text-xs font-mono bg-slate-100 text-slate-600 rounded px-1.5 py-0.5"
            >
              {`{{${p.chave}}}`}
            </span>
          ))}
        </div>
      </Card>

      <Card className="p-4 max-w-3xl space-y-3">
        {carregando ? (
          <p className="text-sm text-slate-400">Carregando...</p>
        ) : (
          <Textarea
            rows={22}
            placeholder={
              'Ex: Pelo presente instrumento particular, de um lado {{clinica_nome}}, e de outro {{paciente_nome}}, portador do CPF {{paciente_cpf}}...'
            }
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="font-mono text-sm"
          />
        )}
        {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}
        {salvo && <p className="text-sm text-green-600">Modelo salvo.</p>}
        <div className="flex justify-end">
          <Button onClick={salvar} disabled={salvando || carregando}>
            {salvando ? 'Salvando...' : 'Salvar modelo'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
