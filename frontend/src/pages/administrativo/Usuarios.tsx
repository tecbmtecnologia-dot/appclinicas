import { useEffect, useState } from 'react'
import { UserCircle2, UserCog } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Select } from '../../components/ui'
import CapturaFoto from '../../components/CapturaFoto'
import { usuariosApi, type UsuarioForm } from '../../api/usuarios'
import { medicosApi } from '../../api/medicos'
import { minhaClinicaApi } from '../../api/minhaClinica'
import { useAuth } from '../../contexts/AuthContext'
import { ApiError } from '../../api/client'
import type { DiaSemanaCodigo, HorarioDia, Medico, Unidade, Usuario } from '../../types'

const vazio: UsuarioForm = {
  nome: '',
  email: '',
  senha: '',
  role: 'recepcao',
  cargo: '',
  medico_id: '',
  unidade_id: '',
  carga_horaria_mensal_horas: 160,
  carga_horaria_semanal_horas: null,
  jornada_semanal: {},
  dia_fechamento_folha: 20,
  data_admissao: '',
}

const DIAS_SEMANA: { codigo: DiaSemanaCodigo; rotulo: string }[] = [
  { codigo: 'seg', rotulo: 'Segunda' },
  { codigo: 'ter', rotulo: 'Terça' },
  { codigo: 'qua', rotulo: 'Quarta' },
  { codigo: 'qui', rotulo: 'Quinta' },
  { codigo: 'sex', rotulo: 'Sexta' },
  { codigo: 'sab', rotulo: 'Sábado' },
  { codigo: 'dom', rotulo: 'Domingo' },
]

function minutosDoHorario(hhmm?: string | null) {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function horasDoHorario(h: Partial<HorarioDia>) {
  const entrada = minutosDoHorario(h.entrada)
  const saida = minutosDoHorario(h.saida)
  if (entrada == null || saida == null) return null
  let minutos = saida - entrada
  const inicioIntervalo = minutosDoHorario(h.inicio_intervalo)
  const fimIntervalo = minutosDoHorario(h.fim_intervalo)
  if (inicioIntervalo != null && fimIntervalo != null) minutos -= fimIntervalo - inicioIntervalo
  return minutos / 60
}

function horasSemanaForm(form: UsuarioForm) {
  const dias = Object.values(form.jornada_semanal ?? {})
  if (dias.length === 0) return null
  return dias.reduce((soma, h) => soma + (horasDoHorario(h) ?? 0), 0)
}

function formatarHoras(h: number) {
  const horas = Math.floor(h)
  const minutos = Math.round((h - horas) * 60)
  return `${horas}h${String(minutos).padStart(2, '0')}`
}

const rotulosRole: Record<Usuario['role'], string> = {
  super_admin: 'Administrador da plataforma',
  admin: 'Administrador',
  coordenador: 'Coordenador(a)',
  medico: 'Médico(a)',
  enfermagem: 'Enfermagem',
  recepcao: 'Recepção',
  financeiro: 'Financeiro',
  pj: 'PJ (comissionado)',
}

export default function Usuarios() {
  const { usuario: usuarioLogado } = useAuth()
  const podeGerenciar = usuarioLogado?.role === 'admin'
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [form, setForm] = useState<UsuarioForm>(vazio)
  const [fotoBlob, setFotoBlob] = useState<Blob | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [erroForm, setErroForm] = useState<string | null>(null)

  function carregar() {
    setCarregando(true)
    Promise.all([
      usuariosApi.listar(),
      medicosApi.listar(),
      podeGerenciar ? minhaClinicaApi.unidades.listar() : Promise.resolve([]),
    ])
      .then(([u, m, uni]) => {
        setUsuarios(u)
        setMedicos(m)
        setUnidades(uni)
      })
      .catch(() => setErro('Não foi possível carregar os usuários. Verifique se o backend está rodando.'))
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  function alternarDia(codigo: DiaSemanaCodigo) {
    setForm((f) => {
      const atual = { ...(f.jornada_semanal ?? {}) }
      if (atual[codigo]) {
        delete atual[codigo]
      } else {
        atual[codigo] = { entrada: '', inicio_intervalo: '', fim_intervalo: '', saida: '' }
      }
      return { ...f, jornada_semanal: atual }
    })
  }

  function atualizarHorarioDia(codigo: DiaSemanaCodigo, campo: keyof HorarioDia, valor: string) {
    setForm((f) => {
      const atual: HorarioDia = f.jornada_semanal?.[codigo] ?? { entrada: '', inicio_intervalo: '', fim_intervalo: '', saida: '' }
      return {
        ...f,
        jornada_semanal: { ...(f.jornada_semanal ?? {}), [codigo]: { ...atual, [campo]: valor } },
      }
    })
  }

  function copiarHorarioParaTodosOsDias() {
    setForm((f) => {
      const dias = Object.keys(f.jornada_semanal ?? {})
      if (dias.length === 0) return f
      const base = f.jornada_semanal![dias[0]]
      return { ...f, jornada_semanal: Object.fromEntries(dias.map((d) => [d, { ...base }])) }
    })
  }

  function abrirNovo() {
    setEditando(null)
    setForm(vazio)
    setFotoBlob(null)
    setErroForm(null)
    setModalAberto(true)
  }

  function abrirEdicao(u: Usuario) {
    setEditando(u)
    setForm({
      nome: u.nome,
      email: u.email,
      senha: '',
      role: u.role,
      cargo: u.cargo ?? '',
      medico_id: u.medico_id ?? '',
      unidade_id: u.unidade_id ?? '',
      carga_horaria_mensal_horas: u.carga_horaria_mensal_horas ?? 160,
      carga_horaria_semanal_horas: u.carga_horaria_semanal_horas ?? null,
      jornada_semanal: u.jornada_semanal ?? {},
      dia_fechamento_folha: u.dia_fechamento_folha ?? 20,
      data_admissao: u.data_admissao ?? '',
      sexo: u.sexo ?? null,
      ativo: !!u.ativo,
    })
    setFotoBlob(null)
    setErroForm(null)
    setModalAberto(true)
  }

  async function salvar() {
    setSalvando(true)
    setErroForm(null)
    try {
      const dados: UsuarioForm = {
        ...form,
        medico_id: form.role === 'medico' ? form.medico_id || null : null,
        unidade_id: form.unidade_id || null,
      }
      let usuario: Usuario
      if (editando) {
        if (!dados.senha) delete dados.senha
        usuario = await usuariosApi.atualizar(editando.id, dados)
      } else {
        usuario = await usuariosApi.criar(dados)
      }
      if (fotoBlob) {
        await usuariosApi.enviarFoto(usuario.id, fotoBlob)
      }
      setModalAberto(false)
      carregar()
    } catch (err) {
      setErroForm(err instanceof ApiError ? err.message : 'Erro ao salvar usuário.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(u: Usuario) {
    if (!confirm(`Remover o usuário ${u.nome}?`)) return
    try {
      await usuariosApi.remover(u.id)
      carregar()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao remover usuário.')
    }
  }

  async function alternarAtivo(u: Usuario) {
    await usuariosApi.atualizar(u.id, { ativo: !u.ativo })
    carregar()
  }

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle="Contas de acesso ao sistema — administradores, médicos e recepção"
        icon={UserCog}
        action={podeGerenciar ? <Button onClick={abrirNovo}>+ Novo usuário</Button> : undefined}
      />

      {erro && <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">{erro}</div>}

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : usuarios.length === 0 ? (
        <EmptyState text="Nenhum usuário cadastrado ainda." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium"></th>
                  <th className="px-4 py-2.5 font-medium">Nome</th>
                  <th className="px-4 py-2.5 font-medium">E-mail</th>
                  <th className="px-4 py-2.5 font-medium">Cargo</th>
                  <th className="px-4 py-2.5 font-medium">Perfil</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-4 py-2.5">
                      {u.foto_url ? (
                        <img src={u.foto_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <UserCircle2 className="h-5 w-5 text-slate-300" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {u.nome}
                      {u.id === usuarioLogado?.id && <span className="text-slate-400 font-normal"> (você)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{u.email}</td>
                    <td className="px-4 py-2.5 text-slate-600">{u.cargo || '—'}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={u.role === 'admin' ? 'blue' : u.role === 'medico' ? 'green' : 'slate'}>
                        {rotulosRole[u.role]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => alternarAtivo(u)} disabled={!podeGerenciar || u.id === usuarioLogado?.id}>
                        <Badge tone={u.ativo ? 'green' : 'red'}>{u.ativo ? 'Ativo' : 'Inativo'}</Badge>
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right space-x-2 whitespace-nowrap">
                      {podeGerenciar && (
                        <>
                          <Button variant="ghost" onClick={() => abrirEdicao(u)}>
                            Editar
                          </Button>
                          <Button variant="danger" onClick={() => remover(u)} disabled={u.id === usuarioLogado?.id}>
                            Remover
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editando ? 'Editar usuário' : 'Novo usuário'}>
        <div className="space-y-3">
          <CapturaFoto fotoAtualUrl={editando?.foto_url} onNovaFoto={setFotoBlob} />
          <div>
            <Label>Nome completo</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>{editando ? 'Nova senha (deixe em branco para manter)' : 'Senha'}</Label>
            <Input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Perfil (controla o acesso no sistema)</Label>
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Usuario['role'] })}>
                <option value="recepcao">Recepção</option>
                <option value="enfermagem">Enfermagem</option>
                <option value="medico">Médico(a)</option>
                <option value="pj">PJ (comissionado)</option>
                <option value="financeiro">Financeiro</option>
                <option value="coordenador">Coordenador(a)</option>
                <option value="admin">Administrador</option>
              </Select>
            </div>
            <div>
              <Label>Cargo (aparece pra ele no menu)</Label>
              <Input
                value={form.cargo ?? ''}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                placeholder="Ex: Fisioterapeuta, Gerente..."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sexo</Label>
              <Select value={form.sexo ?? ''} onChange={(e) => setForm({ ...form, sexo: (e.target.value || null) as Usuario['sexo'] })}>
                <option value="">Não informado</option>
                <option value="feminino">Feminino</option>
                <option value="masculino">Masculino</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {form.role === 'medico' && (
              <div>
                <Label>Vincular ao médico</Label>
                <Select value={form.medico_id ?? ''} onChange={(e) => setForm({ ...form, medico_id: e.target.value })}>
                  <option value="">Nenhum</option>
                  {medicos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unidade de trabalho</Label>
              <Select value={form.unidade_id ?? ''} onChange={(e) => setForm({ ...form, unidade_id: e.target.value })}>
                <option value="">Sede da clínica</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Carga horária mensal (h)</Label>
              <Input
                type="number"
                min={0}
                value={form.carga_horaria_mensal_horas ?? 160}
                onChange={(e) => setForm({ ...form, carga_horaria_mensal_horas: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data de admissão</Label>
              <Input
                type="date"
                value={form.data_admissao ?? ''}
                onChange={(e) => setForm({ ...form, data_admissao: e.target.value })}
              />
              <p className="text-xs text-slate-400 mt-1">Deixe em branco pra usar a data de criação da conta.</p>
            </div>
            <div>
              <Label>Dia de fechamento da folha (1–28)</Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={form.dia_fechamento_folha ?? 20}
                onChange={(e) => setForm({ ...form, dia_fechamento_folha: Number(e.target.value) })}
              />
              <p className="text-xs text-slate-400 mt-1">
                Ex: 20 → o mês fecha sempre do dia 21 do mês anterior ao dia 20 do mês de referência.
              </p>
            </div>
          </div>
          <div>
            <Label>Carga horária semanal (h) — opcional, direto</Label>
            <Input
              type="number"
              min={0}
              placeholder="Ex: 20 — deixe em branco pra calcular pela jornada abaixo"
              value={form.carga_horaria_semanal_horas ?? ''}
              onChange={(e) => setForm({ ...form, carga_horaria_semanal_horas: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Jornada de trabalho (marque os dias e o horário de cada um)</Label>
              {Object.keys(form.jornada_semanal ?? {}).length > 1 && (
                <button type="button" onClick={copiarHorarioParaTodosOsDias} className="text-xs text-brand-700 hover:underline shrink-0">
                  Copiar 1º horário pros demais dias marcados
                </button>
              )}
            </div>
            <div className="space-y-2">
              {DIAS_SEMANA.map(({ codigo, rotulo }) => {
                const horario = form.jornada_semanal?.[codigo]
                return (
                  <div key={codigo} className="border border-slate-200 rounded-lg p-2.5">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
                      <input type="checkbox" checked={!!horario} onChange={() => alternarDia(codigo)} />
                      {rotulo}
                    </label>
                    {horario && (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        <div>
                          <Label>Entrada</Label>
                          <Input
                            type="time"
                            value={horario.entrada ?? ''}
                            onChange={(e) => atualizarHorarioDia(codigo, 'entrada', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Saída almoço</Label>
                          <Input
                            type="time"
                            value={horario.inicio_intervalo ?? ''}
                            onChange={(e) => atualizarHorarioDia(codigo, 'inicio_intervalo', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Volta almoço</Label>
                          <Input
                            type="time"
                            value={horario.fim_intervalo ?? ''}
                            onChange={(e) => atualizarHorarioDia(codigo, 'fim_intervalo', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Saída</Label>
                          <Input
                            type="time"
                            value={horario.saida ?? ''}
                            onChange={(e) => atualizarHorarioDia(codigo, 'saida', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {horasSemanaForm(form) != null && (
              <p className="text-sm text-slate-600 mt-2">
                <span className="font-semibold text-slate-800">{formatarHoras(horasSemanaForm(form)!)}/semana</span> no total
              </p>
            )}
          </div>
          {erroForm && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroForm}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando || !form.nome || !form.email || (!editando && !form.senha)}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
