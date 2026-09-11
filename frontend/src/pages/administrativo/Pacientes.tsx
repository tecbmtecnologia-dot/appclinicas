import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCircle2, Users } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Select } from '../../components/ui'
import CapturaFoto from '../../components/CapturaFoto'
import { buscarEnderecoPorCep, pacientesApi } from '../../api/pacientes'
import { useAuth } from '../../contexts/AuthContext'
import type { CorRaca, EstadoCivil, Paciente, Sexo } from '../../types'

const vazio = {
  nome: '',
  cpf: '',
  rg: '',
  sexo: '' as Sexo | '',
  data_nascimento: '',
  telefone: '',
  email: '',
  convenio: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  estado_civil: '' as EstadoCivil | '',
  data_primeira_consulta: '',
  nome_responsavel: '',
  nome_mae: '',
  profissao: '',
  cor_raca: '' as CorRaca | '',
  peso_kg: '',
  altura_cm: '',
  indicado_por: '',
  plano: '',
  validade_carteira: '',
  cartao_cns: '',
}

type FormPaciente = typeof vazio

const ROTULOS_ESTADO_CIVIL: Record<EstadoCivil, string> = {
  solteiro: 'Solteiro(a)',
  casado: 'Casado(a)',
  divorciado: 'Divorciado(a)',
  viuvo: 'Viúvo(a)',
  uniao_estavel: 'União estável',
  outro: 'Outro',
}

const ROTULOS_COR_RACA: Record<CorRaca, string> = {
  branca: 'Branca',
  preta: 'Preta',
  parda: 'Parda',
  amarela: 'Amarela',
  indigena: 'Indígena',
  nao_informado: 'Não informado',
}

const ROTULOS_SEXO: Record<Sexo, string> = {
  feminino: 'Feminino',
  masculino: 'Masculino',
  nao_informado: 'Não informado',
}

function SecaoTitulo({ children }: { children: string }) {
  return <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-3 border-t border-slate-100">{children}</p>
}

export default function Pacientes() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const podeGerenciarPacientes = usuario ? ['admin', 'coordenador', 'recepcao'].includes(usuario.role) : false
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<FormPaciente>(vazio)
  const [fotoBlob, setFotoBlob] = useState<Blob | null>(null)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [erroForm, setErroForm] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    pacientesApi
      .listar()
      .then(setPacientes)
      .catch(() => setErro('Não foi possível carregar pacientes. Verifique se o backend está rodando.'))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  function abrirNovo() {
    setForm(vazio)
    setFotoBlob(null)
    setErroForm(null)
    setModalAberto(true)
  }

  async function onCepChange(valor: string) {
    setForm((f) => ({ ...f, cep: valor }))
    const limpo = valor.replace(/\D/g, '')
    if (limpo.length === 8) {
      setBuscandoCep(true)
      const dados = await buscarEnderecoPorCep(valor)
      setBuscandoCep(false)
      if (dados) {
        setForm((f) => ({ ...f, logradouro: dados.logradouro, bairro: dados.bairro, cidade: dados.localidade, estado: dados.uf }))
      }
    }
  }

  async function salvar() {
    setSalvando(true)
    setErroForm(null)
    try {
      const dados = {
        ...form,
        peso_kg: form.peso_kg ? Number(form.peso_kg) : null,
        altura_cm: form.altura_cm ? Number(form.altura_cm) : null,
        estado_civil: form.estado_civil || null,
        cor_raca: form.cor_raca || null,
      }
      const paciente = await pacientesApi.criar(dados as unknown as Omit<Paciente, 'id' | 'created_at'>)
      if (fotoBlob) {
        await pacientesApi.enviarFoto(paciente.id, fotoBlob)
      }
      setModalAberto(false)
      carregar()
      navigate(`/administrativo/pacientes/${paciente.id}`)
    } catch {
      setErroForm('Erro ao salvar paciente.')
    } finally {
      setSalvando(false)
    }
  }

  const filtrados = pacientes.filter((p) =>
    `${p.nome} ${p.cpf}`.toLowerCase().includes(busca.toLowerCase()),
  )

  return (
    <div>
      <PageHeader
        title="Pacientes"
        subtitle="Cadastro de pacientes da clínica"
        icon={Users}
        action={podeGerenciarPacientes ? <Button onClick={abrirNovo}>+ Novo paciente</Button> : undefined}
      />

      {erro && <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">{erro}</div>}

      <div className="mb-4 max-w-sm">
        <Input placeholder="Buscar por nome ou CPF..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <EmptyState text="Nenhum paciente cadastrado ainda." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium"></th>
                  <th className="px-4 py-2.5 font-medium">Nome</th>
                  <th className="px-4 py-2.5 font-medium">CPF</th>
                  <th className="px-4 py-2.5 font-medium">Telefone</th>
                  <th className="px-4 py-2.5 font-medium">Convênio</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-slate-100 cursor-pointer hover:bg-slate-50"
                    onClick={() => navigate(`/administrativo/pacientes/${p.id}`)}
                  >
                    <td className="px-4 py-2.5">
                      {p.foto_url ? (
                        <img src={p.foto_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <UserCircle2 className="h-5 w-5 text-slate-300" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{p.nome}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.cpf}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.telefone}</td>
                    <td className="px-4 py-2.5">
                      {p.convenio ? <Badge tone="blue">{p.convenio}</Badge> : <Badge>Particular</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title="Novo paciente">
        <div className="space-y-3">
          <CapturaFoto onNovaFoto={setFotoBlob} />

          <div>
            <Label>Nome completo</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>CPF</Label>
              <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
            </div>
            <div>
              <Label>RG</Label>
              <Input value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} />
            </div>
            <div>
              <Label>Data de nascimento</Label>
              <Input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
            </div>
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Sexo</Label>
              <Select value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value as Sexo })}>
                <option value="">Selecione...</option>
                {Object.entries(ROTULOS_SEXO).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Estado civil</Label>
              <Select value={form.estado_civil} onChange={(e) => setForm({ ...form, estado_civil: e.target.value as EstadoCivil })}>
                <option value="">Selecione...</option>
                {Object.entries(ROTULOS_ESTADO_CIVIL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Cor/raça</Label>
              <Select value={form.cor_raca} onChange={(e) => setForm({ ...form, cor_raca: e.target.value as CorRaca })}>
                <option value="">Selecione...</option>
                {Object.entries(ROTULOS_COR_RACA).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Profissão</Label>
              <Input value={form.profissao} onChange={(e) => setForm({ ...form, profissao: e.target.value })} />
            </div>
            <div>
              <Label>Nome do responsável</Label>
              <Input value={form.nome_responsavel} onChange={(e) => setForm({ ...form, nome_responsavel: e.target.value })} />
            </div>
            <div>
              <Label>Nome da mãe</Label>
              <Input value={form.nome_mae} onChange={(e) => setForm({ ...form, nome_mae: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Peso (kg)</Label>
              <Input type="number" step="0.1" value={form.peso_kg} onChange={(e) => setForm({ ...form, peso_kg: e.target.value })} />
            </div>
            <div>
              <Label>Altura (cm)</Label>
              <Input type="number" value={form.altura_cm} onChange={(e) => setForm({ ...form, altura_cm: e.target.value })} />
            </div>
            <div>
              <Label>Primeira consulta</Label>
              <Input
                type="date"
                value={form.data_primeira_consulta}
                onChange={(e) => setForm({ ...form, data_primeira_consulta: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Indicado por</Label>
            <Input value={form.indicado_por} onChange={(e) => setForm({ ...form, indicado_por: e.target.value })} />
          </div>

          <SecaoTitulo>Endereço</SecaoTitulo>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CEP {buscandoCep && <span className="text-slate-400 normal-case">(buscando...)</span>}</Label>
              <Input value={form.cep} onChange={(e) => onCepChange(e.target.value)} placeholder="00000-000" />
            </div>
            <div>
              <Label>Logradouro</Label>
              <Input value={form.logradouro} onChange={(e) => setForm({ ...form, logradouro: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Número</Label>
              <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
            </div>
            <div>
              <Label>Complemento</Label>
              <Input value={form.complemento} onChange={(e) => setForm({ ...form, complemento: e.target.value })} />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
            </div>
            <div>
              <Label>Estado (UF)</Label>
              <Input maxLength={2} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })} />
            </div>
          </div>

          <SecaoTitulo>Convênio</SecaoTitulo>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Convênio (deixe em branco se particular)</Label>
              <Input value={form.convenio} onChange={(e) => setForm({ ...form, convenio: e.target.value })} />
            </div>
            <div>
              <Label>Plano</Label>
              <Input value={form.plano} onChange={(e) => setForm({ ...form, plano: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Validade da carteirinha</Label>
              <Input
                type="date"
                value={form.validade_carteira}
                onChange={(e) => setForm({ ...form, validade_carteira: e.target.value })}
              />
            </div>
            <div>
              <Label>Cartão CNS</Label>
              <Input value={form.cartao_cns} onChange={(e) => setForm({ ...form, cartao_cns: e.target.value })} />
            </div>
          </div>

          {erroForm && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroForm}</p>}
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
