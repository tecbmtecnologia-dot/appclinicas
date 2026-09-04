import { useEffect, useRef, useState } from 'react'
import { Building2, MapPin, Phone, Plus, Trash2, Upload } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Textarea } from '../../components/ui'
import { clinicasApi, type ClinicaForm } from '../../api/clinicas'
import { ApiError } from '../../api/client'
import type { Clinica, Unidade } from '../../types'

interface FormState {
  nome: string
  cnpj: string
  endereco: string
  especialidadesTexto: string
  logo_url: string
  cor_primaria: string
  admin_nome: string
  admin_email: string
  admin_senha: string
}

const vazio: FormState = {
  nome: '',
  cnpj: '',
  endereco: '',
  especialidadesTexto: '',
  logo_url: '',
  cor_primaria: '#0f766e',
  admin_nome: '',
  admin_email: '',
  admin_senha: '',
}

function paraFormState(c: Clinica): FormState {
  return {
    nome: c.nome,
    cnpj: c.cnpj ?? '',
    endereco: c.endereco ?? '',
    especialidadesTexto: (c.especialidades ?? []).join(', '),
    logo_url: c.logo_url ?? '',
    cor_primaria: c.cor_primaria ?? '#0f766e',
    admin_nome: '',
    admin_email: '',
    admin_senha: '',
  }
}

export default function Clinicas() {
  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Clinica | null>(null)
  const [form, setForm] = useState<FormState>(vazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [enviandoLogo, setEnviandoLogo] = useState(false)
  const arquivoLogoRef = useRef<HTMLInputElement>(null)

  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [carregandoUnidades, setCarregandoUnidades] = useState(false)
  const [novaUnidade, setNovaUnidade] = useState({ nome: '', endereco: '', telefone: '' })
  const [salvandoUnidade, setSalvandoUnidade] = useState(false)

  function carregar() {
    setCarregando(true)
    clinicasApi
      .listar()
      .then(setClinicas)
      .catch(() => setErro('Não foi possível carregar as clínicas. Verifique se o backend está rodando.'))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  function carregarUnidades(clinicaId: string) {
    setCarregandoUnidades(true)
    clinicasApi.unidades
      .listar(clinicaId)
      .then(setUnidades)
      .finally(() => setCarregandoUnidades(false))
  }

  function abrirNovo() {
    setEditando(null)
    setForm(vazio)
    setUnidades([])
    setErroForm(null)
    setModalAberto(true)
  }

  function abrirEdicao(c: Clinica) {
    setEditando(c)
    setForm(paraFormState(c))
    setNovaUnidade({ nome: '', endereco: '', telefone: '' })
    carregarUnidades(c.id)
    setErroForm(null)
    setModalAberto(true)
  }

  function especialidadesArray() {
    return form.especialidadesTexto
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  async function salvar() {
    setSalvando(true)
    setErroForm(null)
    try {
      const dados: ClinicaForm = {
        nome: form.nome,
        cnpj: form.cnpj || null,
        endereco: form.endereco || null,
        especialidades: especialidadesArray(),
        logo_url: form.logo_url || null,
        cor_primaria: form.cor_primaria,
      }
      if (editando) {
        await clinicasApi.atualizar(editando.id, dados)
      } else {
        await clinicasApi.criar({
          ...dados,
          admin_nome: form.admin_nome || undefined,
          admin_email: form.admin_email || undefined,
          admin_senha: form.admin_senha || undefined,
        })
      }
      setModalAberto(false)
      carregar()
    } catch (err) {
      setErroForm(err instanceof ApiError ? err.message : 'Erro ao salvar clínica.')
    } finally {
      setSalvando(false)
    }
  }

  async function enviarLogo(arquivo: File) {
    if (!editando) return
    setEnviandoLogo(true)
    setErroForm(null)
    try {
      const atualizada = await clinicasApi.uploadLogo(editando.id, arquivo)
      setForm((f) => ({ ...f, logo_url: atualizada.logo_url ?? '' }))
      setEditando(atualizada)
      carregar()
    } catch (err) {
      setErroForm(err instanceof ApiError ? err.message : 'Erro ao enviar o logotipo.')
    } finally {
      setEnviandoLogo(false)
    }
  }

  async function alternarAtivo(c: Clinica) {
    await clinicasApi.atualizar(c.id, { ativo: !c.ativo })
    carregar()
  }

  async function remover(c: Clinica) {
    if (!confirm(`Remover a clínica ${c.nome}? Isso só é possível se ela não tiver usuários.`)) return
    try {
      await clinicasApi.remover(c.id)
      carregar()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao remover clínica.')
    }
  }

  async function adicionarUnidade() {
    if (!editando || !novaUnidade.nome) return
    setSalvandoUnidade(true)
    try {
      await clinicasApi.unidades.criar(editando.id, novaUnidade)
      setNovaUnidade({ nome: '', endereco: '', telefone: '' })
      carregarUnidades(editando.id)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao adicionar unidade.')
    } finally {
      setSalvandoUnidade(false)
    }
  }

  async function removerUnidade(u: Unidade) {
    if (!editando) return
    if (!confirm(`Remover a unidade ${u.nome}?`)) return
    await clinicasApi.unidades.remover(editando.id, u.id)
    carregarUnidades(editando.id)
  }

  return (
    <div>
      <PageHeader
        title="Clínicas"
        subtitle="Clientes da plataforma — cada clínica vê apenas os próprios dados"
        icon={Building2}
        action={<Button onClick={abrirNovo}>+ Nova clínica</Button>}
      />

      {erro && <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">{erro}</div>}

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : clinicas.length === 0 ? (
        <EmptyState text="Nenhuma clínica cadastrada ainda." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clinicas.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
                      style={{ backgroundColor: c.cor_primaria || '#0f766e' }}
                    >
                      {c.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{c.nome}</p>
                    <p className="text-xs text-slate-400 truncate">/{c.slug}</p>
                  </div>
                </div>
                <button onClick={() => alternarAtivo(c)}>
                  <Badge tone={c.ativo ? 'green' : 'red'}>{c.ativo ? 'Ativa' : 'Inativa'}</Badge>
                </button>
              </div>

              {c.especialidades.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {c.especialidades.slice(0, 4).map((e) => (
                    <Badge key={e} tone="blue">
                      {e}
                    </Badge>
                  ))}
                  {c.especialidades.length > 4 && <Badge>+{c.especialidades.length - 4}</Badge>}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div>
                  <p className="text-lg font-semibold text-slate-800">{c.total_usuarios ?? 0}</p>
                  <p className="text-[11px] text-slate-400">Usuários</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-800">{c.total_medicos ?? 0}</p>
                  <p className="text-[11px] text-slate-400">Médicos</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-800">{c.total_pacientes ?? 0}</p>
                  <p className="text-[11px] text-slate-400">Pacientes</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={() => abrirEdicao(c)}>
                  Editar
                </Button>
                <Button variant="danger" onClick={() => remover(c)}>
                  Remover
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editando ? 'Editar clínica' : 'Nova clínica'}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {form.logo_url ? (
              <img src={form.logo_url} alt="" className="h-14 w-14 rounded-xl object-cover ring-1 ring-slate-200" />
            ) : (
              <div
                className="h-14 w-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{ backgroundColor: form.cor_primaria || '#0f766e' }}
              >
                {form.nome.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <div className="flex-1">
              <Label>Logotipo</Label>
              {editando ? (
                <>
                  <input
                    ref={arquivoLogoRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const arquivo = e.target.files?.[0]
                      if (arquivo) enviarLogo(arquivo)
                      e.target.value = ''
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => arquivoLogoRef.current?.click()}
                    disabled={enviandoLogo}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {enviandoLogo ? 'Enviando...' : 'Enviar arquivo de imagem'}
                  </Button>
                </>
              ) : (
                <p className="text-xs text-slate-400">Salve a clínica primeiro para poder enviar um arquivo de logotipo.</p>
              )}
            </div>
          </div>

          <div>
            <Label>Nome da clínica</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CNPJ</Label>
              <Input
                placeholder="00.000.000/0000-00"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
              />
            </div>
            <div>
              <Label>Cor principal</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-9 w-12 rounded border border-slate-300"
                  value={form.cor_primaria || '#0f766e'}
                  onChange={(e) => setForm({ ...form, cor_primaria: e.target.value })}
                />
                <Input value={form.cor_primaria} onChange={(e) => setForm({ ...form, cor_primaria: e.target.value })} />
              </div>
            </div>
          </div>
          <div>
            <Label>Endereço (sede)</Label>
            <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
          </div>
          <div>
            <Label>URL do logotipo (alternativa ao upload)</Label>
            <Input
              placeholder="https://..."
              value={form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            />
          </div>
          <div>
            <Label>Especialidades (separadas por vírgula)</Label>
            <Textarea
              rows={2}
              placeholder="Cardiologia, Pediatria, Ortopedia..."
              value={form.especialidadesTexto}
              onChange={(e) => setForm({ ...form, especialidadesTexto: e.target.value })}
            />
          </div>

          {!editando && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-2">Administrador da clínica (opcional agora, pode ser criado depois)</p>
              <div className="space-y-3">
                <div>
                  <Label>Nome</Label>
                  <Input value={form.admin_nome} onChange={(e) => setForm({ ...form, admin_nome: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={form.admin_email}
                      onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Senha</Label>
                    <Input
                      type="password"
                      value={form.admin_senha}
                      onChange={(e) => setForm({ ...form, admin_senha: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {editando && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-2">Unidades (a clínica pode ter mais de uma)</p>
              {carregandoUnidades ? (
                <p className="text-xs text-slate-400">Carregando...</p>
              ) : (
                <div className="space-y-2 mb-2">
                  {unidades.length === 0 && <p className="text-xs text-slate-400">Nenhuma unidade cadastrada.</p>}
                  {unidades.map((u) => (
                    <div key={u.id} className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{u.nome}</p>
                        {u.endereco && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" /> {u.endereco}
                          </p>
                        )}
                        {u.telefone && (
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" /> {u.telefone}
                          </p>
                        )}
                      </div>
                      <button onClick={() => removerUnidade(u)} className="text-slate-400 hover:text-red-600 shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  placeholder="Nome da unidade"
                  value={novaUnidade.nome}
                  onChange={(e) => setNovaUnidade({ ...novaUnidade, nome: e.target.value })}
                />
                <Input
                  placeholder="Endereço"
                  value={novaUnidade.endereco}
                  onChange={(e) => setNovaUnidade({ ...novaUnidade, endereco: e.target.value })}
                />
                <Input
                  placeholder="Telefone"
                  value={novaUnidade.telefone}
                  onChange={(e) => setNovaUnidade({ ...novaUnidade, telefone: e.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="mt-2"
                onClick={adicionarUnidade}
                disabled={salvandoUnidade || !novaUnidade.nome}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar unidade
              </Button>
            </div>
          )}

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
